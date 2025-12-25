import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config, validateConfig } from '../config';
import transferRoutes from './routes/transfers';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/transfers', transferRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

// Start server
async function startServer() {
    try {
        validateConfig();

        app.listen(config.port, config.apiHost, () => {
            console.log('\n🚀 API Server started');
            console.log(`   URL: http://${config.apiHost}:${config.port}`);
            console.log(`   Health check: http://${config.apiHost}:${config.port}/health`);
            console.log(`   API endpoint: http://${config.apiHost}:${config.port}/api/transfers/:address\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Only start if this file is run directly
if (require.main === module) {
    startServer();
}

export { app, startServer };
