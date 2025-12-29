import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Database
    databaseUrl: process.env.DATABASE_URL || '',

    // Blockchain
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.CHAIN_ID || '31337'),

    // Token addresses to index (support multiple tokens)
    tokenAddresses: process.env.TOKEN_ADDRESSES?.split(',').map(addr => addr.trim()) || [],

    // Bank addresses for categorization
    bankAddresses: process.env.BANK_ADDRESSES?.split(',').map(addr => addr.trim().toLowerCase()) || [],

    // API
    port: parseInt(process.env.PORT || '3000'),
    apiHost: process.env.API_HOST || '0.0.0.0',

    // Indexer
    startBlock: BigInt(process.env.START_BLOCK || '0'),
    batchSize: parseInt(process.env.BATCH_SIZE || '10000'),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
};

// Validate required config
export function validateConfig() {
    if (!config.databaseUrl) {
        throw new Error('DATABASE_URL is required');
    }

    if (config.tokenAddresses.length === 0) {
        throw new Error('TOKEN_ADDRESSES is required');
    }

    console.log('✓ Configuration validated');
    console.log(`  - RPC URL: ${config.rpcUrl}`);
    console.log(`  - Chain ID: ${config.chainId}`);
    console.log(`  - Tokens to index: ${config.tokenAddresses.join(', ')}`);
    console.log(`  - API Port: ${config.port}`);
}
