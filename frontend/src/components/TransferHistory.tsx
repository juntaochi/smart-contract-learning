'use client'

import { useTransfers, useTransferSummary, type Transfer } from '@/hooks/useTransfers';
import { useAccount } from 'wagmi';
import { useState, useMemo } from 'react';
import { formatUnits } from 'viem';
import { TOKENS, BANKS } from '@/config/abis';

type TransactionType = 'INCOMING' | 'OUTGOING' | 'DEPOSIT' | 'WITHDRAWAL';

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

    // Map address to token info
    const getTokenInfo = (tokenAddress: string) => {
        const normalizedAddr = tokenAddress.toLowerCase();
        const found = Object.values(TOKENS).find(t => t.address.toLowerCase() === normalizedAddr);
        return found || { symbol: 'TOKEN', name: 'Unknown Token' };
    };

    // Identify bank interactions
    const bankAddresses = useMemo(() =>
        Object.values(BANKS).map(addr => addr.toLowerCase()),
        []);

    const getTransactionType = (transfer: Transfer): TransactionType => {
        if (transfer.category === 'deposit') return 'DEPOSIT';
        if (transfer.category === 'withdrawal') return 'WITHDRAWAL';

        const to = transfer.to.toLowerCase();
        const from = transfer.from.toLowerCase();

        if (bankAddresses.includes(to)) return 'DEPOSIT';
        if (bankAddresses.includes(from)) return 'WITHDRAWAL';
        return transfer.direction === 'incoming' ? 'INCOMING' : 'OUTGOING';
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🔌</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-500 mb-8 max-w-sm text-center">
                    Connect your wallet to view your comprehensive ERC20 transfer history and TokenBank activity.
                </p>
                <appkit-button />
            </div>
        );
    }

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatValue = (value: string) => {
        try {
            // Most tokens in this project use 18 decimals
            const formatted = formatUnits(BigInt(value), 18);
            return parseFloat(formatted).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            });
        } catch {
            return value;
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const StatusTag = ({ type }: { type: TransactionType }) => {
        const styles = {
            INCOMING: 'bg-green-50 text-green-700 border-green-100',
            OUTGOING: 'bg-gray-50 text-gray-600 border-gray-100',
            DEPOSIT: 'bg-blue-50 text-blue-700 border-blue-100',
            WITHDRAWAL: 'bg-purple-50 text-purple-700 border-purple-100',
        };

        const labels = {
            INCOMING: 'Received',
            OUTGOING: 'Sent',
            DEPOSIT: 'Deposit',
            WITHDRAWAL: 'Withdrawal',
        };

        const icons = {
            INCOMING: '↓',
            OUTGOING: '↑',
            DEPOSIT: '📥',
            WITHDRAWAL: '📤',
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[type]}`}>
                <span>{icons[type]}</span>
                {labels[type]}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Activity History</h1>
                    <p className="mt-1 text-gray-500">Track your token transfers and bank interactions</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={tokenFilter}
                        onChange={(e) => {
                            setTokenFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="">All Tokens</option>
                        {Object.entries(TOKENS).map(([key, token]) => (
                            <option key={key} value={token.address}>{token.name} ({token.symbol})</option>
                        ))}
                    </select>
                    <appkit-button />
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Events', value: summary?.totalTransfers || 0, icon: '📊', color: 'blue' },
                    { label: 'Total Received', value: summary?.totalReceived || 0, icon: '📈', color: 'green' },
                    { label: 'Total Sent', value: summary?.totalSent || 0, icon: '📉', color: 'orange' },
                    { label: 'Token Assets', value: summary?.uniqueTokens || 0, icon: '💎', color: 'purple' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 text-sm font-medium">{stat.label}</span>
                            <span className="text-xl">{stat.icon}</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {summaryLoading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" /> : stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Asset</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">From / To</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tx</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transfersLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-10 bg-gray-50 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : transfersError ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-red-500 font-medium">
                                        Failed to load activities: {transfersError}
                                    </td>
                                </tr>
                            ) : !transfersData?.data?.transfers.length ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-4xl mb-4">☁️</span>
                                            <p className="text-gray-500 font-medium">No activity found for this criterion</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transfersData.data.transfers.map((transfer) => {
                                    const token = getTokenInfo(transfer.tokenAddress);
                                    const txType = getTransactionType(transfer);

                                    return (
                                        <tr key={transfer.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <StatusTag type={txType} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">
                                                        {token.symbol[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{token.symbol}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono tracking-tighter">
                                                            {formatAddress(transfer.tokenAddress)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {formatValue(transfer.value)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-[11px]">
                                                        <span className="text-gray-400 w-8">From:</span>
                                                        <a
                                                            href={`https://sepolia.etherscan.io/address/${transfer.from}`}
                                                            target="_blank"
                                                            className="font-mono text-blue-600 hover:underline"
                                                        >
                                                            {formatAddress(transfer.from)}
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px]">
                                                        <span className="text-gray-400 w-8">To:</span>
                                                        <a
                                                            href={`https://sepolia.etherscan.io/address/${transfer.to}`}
                                                            target="_blank"
                                                            className="font-mono text-blue-600 hover:underline"
                                                        >
                                                            {formatAddress(transfer.to)}
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(transfer.blockTimestamp)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${transfer.transactionHash}`}
                                                    target="_blank"
                                                    className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {transfersData?.data && transfersData.data.pagination.totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-500">
                            Showing page <span className="text-gray-900">{transfersData.data.pagination.page}</span> of <span className="text-gray-900">{transfersData.data.pagination.totalPages}</span>
                            <span className="mx-2">•</span>
                            <span className="text-gray-900">{transfersData.data.pagination.total}</span> total events
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page >= transfersData.data.pagination.totalPages}
                                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
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

