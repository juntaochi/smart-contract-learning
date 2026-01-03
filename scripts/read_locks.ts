
import {
    createPublicClient,
    createWalletClient,
    http,
    parseAbi,
    keccak256,
    encodePacked,
    toHex,
    pad,
    hexToBigInt,
    getAddress,
    defineChain
} from 'viem';
import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

// Define ABI and Bytecode from artifact
const artifactPath = path.join(process.cwd(), 'out/esRNT.sol/esRNT.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const abi = artifact.abi;
const bytecode = artifact.bytecode.object as Hex;

// Local Anvil Chain
const anvilChain = defineChain({
    id: 31337,
    name: 'Anvil',
    network: 'anvil',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
        public: { http: ['http://127.0.0.1:8545'] },
    },
});

const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

const client = createPublicClient({
    chain: anvilChain,
    transport: http(),
});

const walletClient = createWalletClient({
    chain: anvilChain,
    transport: http(),
    account,
});

async function main() {
    console.log('Deploying contract...');
    const hash = await walletClient.deployContract({
        abi,
        bytecode,
    });

    console.log('Transaction hash:', hash);

    const receipt = await client.waitForTransactionReceipt({ hash });
    const contractAddress = receipt.contractAddress;

    if (!contractAddress) {
        throw new Error('Contract not deployed');
    }

    console.log('Contract deployed at:', contractAddress);

    // Read _locks length at slot 0
    const lengthHex = await client.getStorageAt({
        address: contractAddress,
        slot: toHex(0, { size: 32 }),
    });

    if (!lengthHex) throw new Error('Failed to read slot 0');

    const length = hexToBigInt(lengthHex);
    console.log(`_locks length: ${length}`);

    // Base slot for array data
    const baseSlotHash = keccak256(pad(toHex(0), { size: 32 }));
    const baseSlot = hexToBigInt(baseSlotHash);

    for (let i = 0n; i < length; i++) {
        // Calculate slots for current element
        // Each element takes 2 slots
        const slotAIndex = baseSlot + i * 2n;
        const slotBIndex = baseSlot + i * 2n + 1n;

        const slotA = await client.getStorageAt({
            address: contractAddress,
            slot: toHex(slotAIndex, { size: 32 }),
        });

        const slotB = await client.getStorageAt({
            address: contractAddress,
            slot: toHex(slotBIndex, { size: 32 }),
        });

        if (!slotA || !slotB) {
            console.log(`Failed to read slots for index ${i}`);
            continue;
        }

        // Parse Slot A (packed: [padding(4bytes)][startTime(8bytes)][user(20bytes)])
        // Slot is 32 bytes (hex string len 66)
        // rightmost 40 chars = user (20 bytes)
        // next 16 chars = startTime (8 bytes)

        // Remove 0x
        const valA = slotA.slice(2);
        const valB = slotB.slice(2);

        const userHex = ('0x' + valA.slice(-40)) as Hex;
        const user = getAddress(userHex); // Checksum address

        const startTimeHex = ('0x' + valA.slice(-56, -40)) as Hex;
        const startTime = hexToBigInt(startTimeHex);

        const amountHex = ('0x' + valB) as Hex;
        const amount = hexToBigInt(amountHex);

        console.log(`locks[${i}]: user:${user} ,startTime:${startTime},amount:${amount}`);
    }
}

main().catch(console.error);
