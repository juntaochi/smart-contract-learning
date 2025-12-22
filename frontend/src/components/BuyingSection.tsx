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
        <div className="p-6 border rounded-xl shadow-sm bg-white dark:bg-zinc-900 space-y-6">
            <h2 className="text-2xl font-bold">Buyer Dashboard</h2>

            {/* Faucet Section */}
            <div className="border-b pb-4">
                <h3 className="font-semibold mb-2">1. Get Test Tokens</h3>
                <button
                    onClick={handleMintTokens}
                    disabled={isMintPending || isMintConfirming}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {isMintPending ? 'Confirming...' : isMintConfirming ? 'Minting...' : 'Mint 1000 Tokens'}
                </button>
            </div>

            {/* Approve Section */}
            <div className="border-b pb-4">
                <h3 className="font-semibold mb-2">2. Approve Payment</h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Amount to Approve"
                        className="border p-2 rounded dark:bg-zinc-800"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                    />
                    <button
                        onClick={handleApprove}
                        disabled={isApprovePending || isApproveConfirming}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                        {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve Tokens'}
                    </button>
                </div>
            </div>

            {/* Buy Section */}
            <div>
                <h3 className="font-semibold mb-2">3. Buy NFT</h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Token ID to Buy"
                        className="border p-2 rounded dark:bg-zinc-800"
                        value={tokenId}
                        onChange={e => setTokenId(e.target.value)}
                    />
                    <button
                        onClick={handleBuy}
                        disabled={isBuyPending || isBuyConfirming}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                        {isBuyPending || isBuyConfirming ? 'Buying...' : 'Buy NFT'}
                    </button>
                </div>
                {isBuySuccess && <p className="text-green-500 text-sm mt-2">NFT Purchased Successfully!</p>}
            </div>
        </div>
    )
}
