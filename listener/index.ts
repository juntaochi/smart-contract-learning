console.log('Script starting...');
import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { mainnet, localhost } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// Load ABI
const nftMarketArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'abis/NFTMarket.json'), 'utf8')
);
const nftMarketAbi = nftMarketArtifact.abi;

async function main() {
    const client = createPublicClient({
        chain: localhost,
        transport: http('http://127.0.0.1:8545'),
    });

    console.log('--- NFT Market Listener Started ---');
    console.log('Listening for NFTListed and NFTSold events on localhost:8545...');

    // Watch for NFTListed events
    client.watchEvent({
        event: parseAbiItem('event NFTListed(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 price)'),
        onLogs: (logs) => {
            logs.forEach((log) => {
                const { seller, nftContract, tokenId, price } = log.args;
                console.log('\n[EVENT: NFTListed]');
                console.log(`- Seller: ${seller}`);
                console.log(`- NFT Contract: ${nftContract}`);
                console.log(`- Token ID: ${tokenId}`);
                console.log(`- Price: ${price} units`);
                console.log(`- Transaction Hash: ${log.transactionHash}`);
            });
        },
    });

    // Watch for NFTSold events
    client.watchEvent({
        event: parseAbiItem('event NFTSold(address indexed seller, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 price)'),
        onLogs: (logs) => {
            logs.forEach((log) => {
                const { seller, buyer, nftContract, tokenId, price } = log.args;
                console.log('\n[EVENT: NFTSold]');
                console.log(`- Seller: ${seller}`);
                console.log(`- Buyer: ${buyer}`);
                console.log(`- NFT Contract: ${nftContract}`);
                console.log(`- Token ID: ${tokenId}`);
                console.log(`- Price: ${price} units`);
                console.log(`- Transaction Hash: ${log.transactionHash}`);
            });
        },
    });

    // Keep process alive
    setInterval(() => { }, 1000);
}

main().catch((err) => {
    console.error('Error in listener:', err);
    process.exit(1);
});
