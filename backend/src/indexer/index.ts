import { ERC20Indexer } from './erc20-indexer';
import { validateConfig } from '../config';

async function main() {
    try {
        // Validate configuration
        validateConfig();

        // Create and start indexer
        const indexer = new ERC20Indexer();
        await indexer.start();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n\nReceived SIGINT, shutting down gracefully...');
            await indexer.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n\nReceived SIGTERM, shutting down gracefully...');
            await indexer.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
