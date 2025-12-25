import { PrismaClient } from '@prisma/client';

// Global Prisma instance
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });

        console.log('✓ Database connection initialized');
    }

    return prisma;
}

export async function disconnectDatabase() {
    if (prisma) {
        await prisma.$disconnect();
        console.log('✓ Database connection closed');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});
