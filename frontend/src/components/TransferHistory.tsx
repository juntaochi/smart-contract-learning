'use client'

import { useTransfers, useTransferSummary, type Transfer } from '@/hooks/useTransfers';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { formatUnits } from 'viem';

export default function TransferHistory() {
    const { address, isConnected } = useAccount();
    const [page, setPage] = useState(1);
    const [tokenFilter, setTokenFilter] = useState('');

    const { data: transfersData, loading: transfersLoading, error: transfersError } = useTransfers(
        address,
        {
            page,
            limit: 20,
            tokenAddress: tokenFilter || undefined,
            autoRefresh: true,
        }
    );

    const { data: summary, loading: summaryLoading } = useTransferSummary(
        address,
        tokenFilter || undefined
    );

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔌</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-6">
                        Please connect your wallet to view your transfer history
                    </p>
                    <appkit-button />
                </div>
            </div>
        );
    }

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatValue = (value: string) => {
        try {
            const formatted = formatUnits(BigInt(value), 18);
            return parseFloat(formatted).toFixed(4);
        } catch {
            return value;
        }
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Transfer History</h1>
                    <p className="text-gray-600">
                        View all ERC20 token transfers for your address
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <appkit-button />
                </div>
            </div>

            {/* Summary Cards */}
            {!summaryLoading && summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-md">
                        <div className="text-sm opacity-90 mb-1">Total Transfers</div>
                        <div className="text-3xl font-bold">{summary.totalTransfers}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-md">
                        <div className="text-sm opacity-90 mb-1">Received</div>
                        <div className="text-3xl font-bold">{summary.totalReceived}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-md">
                        <div className="text-sm opacity-90 mb-1">Sent</div>
                        <div className="text-3xl font-bold">{summary.totalSent}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-md">
                        <div className="text-sm opacity-90 mb-1">Unique Tokens</div>
                        <div className="text-3xl font-bold">{summary.uniqueTokens}</div>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter by Token:</label>
                    <input
                        type="text"
                        placeholder="Token address (optional)"
                        value={tokenFilter}
                        onChange={(e) => {
                            setTokenFilter(e.target.value);
                            setPage(1);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    {tokenFilter && (
                        <button
                            onClick={() => {
                                setTokenFilter('');
                                setPage(1);
                            }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    {transfersLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">Loading transfers...</div>
                        </div>
                    ) : transfersError ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-red-600">Error: {transfersError}</div>
                        </div>
                    ) : !transfersData?.data?.transfers.length ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="text-4xl mb-2">📭</div>
                                <div className="text-gray-500">No transfers found</div>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        From
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        To
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tx Hash
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {transfersData.data.transfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {transfer.direction === 'incoming' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    ⬇️ IN
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    ⬆️ OUT
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <a
                                                href={`https://sepolia.etherscan.io/address/${transfer.from}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                                            >
                                                {formatAddress(transfer.from)}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <a
                                                href={`https://sepolia.etherscan.io/address/${transfer.to}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                                            >
                                                {formatAddress(transfer.to)}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm font-medium">
                                                {formatValue(transfer.value)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(transfer.blockTimestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <a
                                                href={`https://sepolia.etherscan.io/tx/${transfer.transactionHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                                            >
                                                {formatAddress(transfer.transactionHash)}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {transfersData?.data && transfersData.data.pagination.totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Page {transfersData.data.pagination.page} of{' '}
                            {transfersData.data.pagination.totalPages}
                            {' '}({transfersData.data.pagination.total} total transfers)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= transfersData.data.pagination.totalPages}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
