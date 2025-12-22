'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { PAYMENT_TOKEN_ABI, PAYMENT_TOKEN_ADDRESS, MARKET_ABI, MARKET_ADDRESS, NFT_ADDRESS } from '@/config/constants'

export default function BuyingSection() {
    const { address } = useAccount()

    const [tokenId, setTokenId] = useState('')
    const [price, setPrice] = useState('') // For approval

    // 1. Mint Tokens
    const { writeContract: mintToken, data: mintHash, isPending: isMintPending } = useWriteContract()
    const { isLoading: isMintConfirming } = useWaitForTransactionReceipt({ hash: mintHash })

    // 2. Approve Tokens
    const { writeContract: approveToken, data: approveHash, isPending: isApprovePending } = useWriteContract()
    const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveHash })

    // 3. Buy NFT
    const { writeContract: buyNFT, data: buyHash, isPending: isBuyPending } = useWriteContract()
    const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash })

    const handleMintTokens = () => {
        mintToken({
            address: PAYMENT_TOKEN_ADDRESS,
            abi: PAYMENT_TOKEN_ABI,
            functionName: 'mint',
            args: [parseEther('1000')] // Mint 1000 tokens
        })
    }

    const handleApprove = () => {
        if (!price) return
        approveToken({
            address: PAYMENT_TOKEN_ADDRESS,
            abi: PAYMENT_TOKEN_ABI,
            functionName: 'approve',
            args: [MARKET_ADDRESS, parseEther(price)]
        })
    }

    const handleBuy = () => {
        if (!tokenId) return
        buyNFT({
            address: MARKET_ADDRESS,
            abi: MARKET_ABI,
            functionName: 'buyNFT',
            args: [NFT_ADDRESS, BigInt(tokenId)]
        })
    }

    return (
        <div className="p-6 space-y-8">
            {/* Step 1: Faucet */}
            <div className="relative pl-8 border-l-2 border-green-100 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-green-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Get Test Tokens</h3>
                <p className="text-sm text-gray-500 mb-4">Get free tokens to purchase NFTs.</p>
                <button
                    onClick={handleMintTokens}
                    disabled={isMintPending || isMintConfirming}
                    className="w-full sm:w-auto px-6 py-2.5 bg-green-600/10 text-green-700 font-medium rounded-lg hover:bg-green-600/20 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isMintPending ? 'Confirming...' : isMintConfirming ? 'Minting...' : 'Mint 1000 Tokens'}
                </button>
            </div>

            {/* Step 2: Approve */}
            <div className="relative pl-8 border-l-2 border-yellow-100 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-yellow-400 ring-4 ring-yellow-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Approve Payment</h3>
                <p className="text-sm text-gray-500 mb-4">Allow market to spend your tokens.</p>
                <div className="flex gap-3">
                    <input
                        type="number"
                        placeholder="Amount"
                        className="flex-1 min-w-0 resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-100 transition"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                    />
                    <button
                        onClick={handleApprove}
                        disabled={isApprovePending || isApproveConfirming}
                        className="px-6 py-2.5 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 active:scale-95 transition shadow-sm shadow-yellow-200 disabled:opacity-50"
                    >
                        {isApprovePending || isApproveConfirming ? 'Wait...' : 'Approve'}
                    </button>
                </div>
            </div>

            {/* Step 3: Buy */}
            <div className="relative pl-8">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-500 ring-4 ring-red-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Buy NFT</h3>
                <p className="text-sm text-gray-500 mb-4">Enter Token ID to purchase instantly.</p>
                <div className="flex gap-3">
                    <input
                        type="number"
                        placeholder="Token ID"
                        className="flex-1 min-w-0 resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 transition"
                        value={tokenId}
                        onChange={e => setTokenId(e.target.value)}
                    />
                    <button
                        onClick={handleBuy}
                        disabled={isBuyPending || isBuyConfirming}
                        className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:scale-95 transition shadow-sm shadow-red-200 disabled:opacity-50"
                    >
                        {isBuyPending || isBuyConfirming ? 'Buying...' : 'Buy NFT'}
                    </button>
                </div>
                {isBuySuccess && <div className="mt-3 p-3 bg-green-50 text-green-700 text-sm rounded-lg animate-fade-in">NFT Purchased Successfully!</div>}
            </div>
        </div>
    )
}
