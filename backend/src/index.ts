import { startServer } from './api/server';
import { ERC20Indexer } from './indexer/erc20-indexer';
import { validateConfig } from './config';

/**
 * Main entry point - starts both API server and indexer
 */
async function main() {
    try {
        console.log('🔧 ERC20 Transfer Indexer System');
        console.log('================================\n');

        // Validate configuration
        validateConfig();

        // Start API server
        await startServer();

        // Start indexer
        const indexer = new ERC20Indexer();
        await indexer.start();

        // Handle graceful shutdown
        const shutdown = async () => {
            console.log('\n\n🛑 Shutting down gracefully...');
            await indexer.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
