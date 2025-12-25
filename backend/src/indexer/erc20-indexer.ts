import { createPublicClient, http, parseAbiItem, Address, Log } from 'viem';
import { localhost, sepolia, mainnet } from 'viem/chains';
import { getPrismaClient } from '../utils/db';
import { config } from '../config';
import { normalizeAddress, formatBlockTimestamp, sleep, chunkArray } from '../utils/helpers';

const ERC20_TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export class ERC20Indexer {
    private client;
    private prisma;
    private isRunning = false;

    constructor() {
        // Determine chain based on chainId
        let chain;
        switch (config.chainId) {
            case 1:
                chain = mainnet;
                break;
            case 11155111:
                chain = sepolia;
                break;
            default:
                chain = localhost;
        }

        this.client = createPublicClient({
            chain,
            transport: http(config.rpcUrl),
        });

        this.prisma = getPrismaClient();
    }

    /**
     * Index historical transfer events from a specific block range
     */
    async indexHistoricalTransfers(tokenAddress: string, fromBlock: bigint, toBlock: bigint) {
        console.log(`\n📥 Indexing historical transfers for ${tokenAddress}`);
        console.log(`   Block range: ${fromBlock} -> ${toBlock}`);

        const logs = await this.client.getLogs({
            address: tokenAddress as Address,
            event: ERC20_TRANSFER_EVENT,
            fromBlock,
            toBlock,
        });

        console.log(`   Found ${logs.length} transfer events`);

        if (logs.length > 0) {
            await this.saveTransfers(logs, tokenAddress);
        }

        return logs.length;
    }

    /**
     * Save transfer events to database
     */
    private async saveTransfers(logs: any[], tokenAddress: string) {
        const transfers = await Promise.all(
            logs.map(async (log) => {
                const block = await this.client.getBlock({ blockNumber: log.blockNumber! });

                return {
                    transactionHash: log.transactionHash!,
                    blockNumber: log.blockNumber!,
                    blockTimestamp: formatBlockTimestamp(block.timestamp),
                    logIndex: log.logIndex!,
                    tokenAddress: normalizeAddress(tokenAddress),
                    from: normalizeAddress(log.args.from as string),
                    to: normalizeAddress(log.args.to as string),
                    value: (log.args.value as bigint).toString(),
                };
            })
        );

        // Use createMany with skipDuplicates to avoid errors on re-indexing
        const result = await this.prisma.transfer.createMany({
            data: transfers,
            skipDuplicates: true,
        });

        console.log(`   ✓ Saved ${result.count} new transfers to database`);
    }

    /**
     * Get the last indexed block for a token
     */
    private async getLastIndexedBlock(tokenAddress: string): Promise<bigint> {
        const tracker = await this.prisma.blockTracker.findUnique({
            where: { tokenAddress: normalizeAddress(tokenAddress) },
        });

        return tracker ? tracker.lastIndexedBlock : config.startBlock;
    }

    /**
     * Update the last indexed block for a token
     */
    private async updateLastIndexedBlock(tokenAddress: string, blockNumber: bigint) {
        await this.prisma.blockTracker.upsert({
            where: { tokenAddress: normalizeAddress(tokenAddress) },
            update: { lastIndexedBlock: blockNumber },
            create: {
                tokenAddress: normalizeAddress(tokenAddress),
                lastIndexedBlock: blockNumber,
            },
        });
    }

    /**
     * Index all historical transfers up to current block
     */
    async catchUp(tokenAddress: string) {
        const currentBlock = await this.client.getBlockNumber();
        let fromBlock = await this.getLastIndexedBlock(tokenAddress);

        console.log(`\n🔄 Catching up for token: ${tokenAddress}`);
        console.log(`   Last indexed block: ${fromBlock}`);
        console.log(`   Current block: ${currentBlock}`);

        if (fromBlock >= currentBlock) {
            console.log(`   ✓ Already up to date`);
            return;
        }

        // Index in batches
        while (fromBlock < currentBlock) {
            const toBlock = fromBlock + BigInt(config.batchSize) > currentBlock
                ? currentBlock
                : fromBlock + BigInt(config.batchSize);

            await this.indexHistoricalTransfers(tokenAddress, fromBlock + 1n, toBlock);
            await this.updateLastIndexedBlock(tokenAddress, toBlock);

            fromBlock = toBlock;

            // Small delay to avoid rate limiting
            await sleep(100);
        }

        console.log(`   ✓ Caught up to block ${currentBlock}\n`);
    }

    /**
     * Watch for new transfer events in real-time
     */
    async watchTransfers(tokenAddress: string) {
        console.log(`\n👀 Watching for new transfers on ${tokenAddress}...`);

        this.client.watchEvent({
            address: tokenAddress as Address,
            event: ERC20_TRANSFER_EVENT,
            onLogs: async (logs) => {
                console.log(`\n🔔 New transfer event detected!`);
                await this.saveTransfers(logs, tokenAddress);

                // Update last indexed block
                if (logs.length > 0) {
                    const maxBlock = logs.reduce(
                        (max, log) => (log.blockNumber! > max ? log.blockNumber! : max),
                        0n
                    );
                    await this.updateLastIndexedBlock(tokenAddress, maxBlock);
                }
            },
        });
    }

    /**
     * Start indexing service
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️  Indexer is already running');
            return;
        }

        this.isRunning = true;
        console.log('\n🚀 Starting ERC20 Transfer Indexer...\n');

        // Index all configured tokens
        for (const tokenAddress of config.tokenAddresses) {
            // First, catch up with historical data
            await this.catchUp(tokenAddress);

            // Then, start watching for new events
            await this.watchTransfers(tokenAddress);
        }

        console.log('✓ Indexer is running. Press Ctrl+C to stop.\n');
    }

    /**
     * Stop indexing service
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        console.log('\n⏹️  Stopping indexer...');
    }
}
