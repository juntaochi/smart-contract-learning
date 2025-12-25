import { Address, isAddress } from 'viem';

/**
 * Normalize Ethereum address to lowercase checksum format
 */
export function normalizeAddress(address: string): string {
    if (!isAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
    }
    return address.toLowerCase();
}

/**
 * Format timestamp from blockchain to Date object
 */
export function formatBlockTimestamp(timestamp: bigint): Date {
    return new Date(Number(timestamp) * 1000);
}

/**
 * Convert BigInt to string for JSON serialization
 */
export function bigIntToString(value: bigint): string {
    return value.toString();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
