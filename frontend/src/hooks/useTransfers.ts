import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Transfer {
    id: string;
    transactionHash: string;
    blockNumber: string;
    blockTimestamp: string;
    tokenAddress: string;
    from: string;
    to: string;
    value: string;
    direction: 'incoming' | 'outgoing';
}

export interface TransferSummary {
    address: string;
    totalSent: number;
    totalReceived: number;
    totalTransfers: number;
    uniqueTokens: number;
}

export interface TransfersResponse {
    success: boolean;
    data: {
        transfers: Transfer[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export interface SummaryResponse {
    success: boolean;
    data: TransferSummary;
}

/**
 * Hook to fetch transfer history for an address
 */
export function useTransfers(
    address: string | undefined,
    options?: {
        page?: number;
        limit?: number;
        tokenAddress?: string;
        autoRefresh?: boolean;
    }
) {
    const [data, setData] = useState<TransfersResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { page = 1, limit = 20, tokenAddress, autoRefresh = false } = options || {};

    useEffect(() => {
        if (!address) {
            setData(null);
            return;
        }

        const fetchTransfers = async () => {
            setLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: limit.toString(),
                });

                if (tokenAddress) {
                    params.append('tokenAddress', tokenAddress);
                }

                const response = await fetch(
                    `${API_BASE_URL}/api/transfers/${address}?${params}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result: TransfersResponse = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch transfers');
                console.error('Error fetching transfers:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTransfers();

        // Auto-refresh if enabled
        if (autoRefresh) {
            const interval = setInterval(fetchTransfers, 10000); // Refresh every 10 seconds
            return () => clearInterval(interval);
        }
    }, [address, page, limit, tokenAddress, autoRefresh]);

    return { data, loading, error };
}

/**
 * Hook to fetch transfer summary for an address
 */
export function useTransferSummary(address: string | undefined, tokenAddress?: string) {
    const [data, setData] = useState<TransferSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!address) {
            setData(null);
            return;
        }

        const fetchSummary = async () => {
            setLoading(true);
            setError(null);

            try {
                const params = tokenAddress ? `?tokenAddress=${tokenAddress}` : '';
                const response = await fetch(
                    `${API_BASE_URL}/api/transfers/${address}/summary${params}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result: SummaryResponse = await response.json();
                setData(result.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch summary');
                console.error('Error fetching summary:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [address, tokenAddress]);

    return { data, loading, error };
}
