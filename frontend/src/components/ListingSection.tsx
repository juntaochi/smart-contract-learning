'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { MARKET_ABI, NFT_ABI, NFT_ADDRESS, MARKET_ADDRESS } from '@/config/constants'

export default function ListingSection() {
    const { address } = useAccount()

    const [tokenId, setTokenId] = useState('')
    const [price, setPrice] = useState('')
    const [isMinting, setIsMinting] = useState(false)

    // 1. Mint NFT
    const { writeContract: mintNFT, data: mintHash, isPending: isMintPending } = useWriteContract()
    const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })

    // 2. Approve Market
    const { writeContract: approveNFT, data: approveHash, isPending: isApprovePending } = useWriteContract()
    const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveHash })

    // 3. List Item
    const { writeContract: listNFT, data: listHash, isPending: isListPending } = useWriteContract()
    const { isLoading: isListConfirming, isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash })

    const handleMint = async () => {
        // Mint random Token URI for demo
        mintNFT({
            address: NFT_ADDRESS,
            abi: NFT_ABI,
            functionName: 'safeMint',
            args: [address as `0x${string}`, 'ipfs://QmY...']
        })
    }

    const handleApprove = () => {
        if (!tokenId) return
        approveNFT({
            address: NFT_ADDRESS,
            abi: NFT_ABI,
            functionName: 'approve',
            args: [MARKET_ADDRESS, BigInt(tokenId)]
        })
    }

    const handleList = () => {
        if (!tokenId || !price) return
        listNFT({
            address: MARKET_ADDRESS,
            abi: MARKET_ABI,
            functionName: 'list',
            args: [NFT_ADDRESS, BigInt(tokenId), parseEther(price)]
        })
    }

    return (
        <div className="p-6 border rounded-xl shadow-sm bg-white dark:bg-zinc-900 space-y-6">
            <h2 className="text-2xl font-bold">Seller Dashboard</h2>

            {/* Mint Section */}
            <div className="border-b pb-4">
                <h3 className="font-semibold mb-2">1. Get Test NFT</h3>
                <button
                    onClick={handleMint}
                    disabled={isMintPending || isMintConfirming}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {isMintPending ? 'Confirming...' : isMintConfirming ? 'Minting...' : 'Mint New NFT'}
                </button>
                {isMintSuccess && <p className="text-green-500 text-sm mt-2">NFT Minted! Check Explorer for Token ID.</p>}
            </div>

            {/* Approve Section */}
            <div className="border-b pb-4">
                <h3 className="font-semibold mb-2">2. Approve Market</h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Token ID"
                        className="border p-2 rounded dark:bg-zinc-800"
                        value={tokenId}
                        onChange={e => setTokenId(e.target.value)}
                    />
                    <button
                        onClick={handleApprove}
                        disabled={isApprovePending || isApproveConfirming}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                        {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve'}
                    </button>
                </div>
            </div>

            {/* List Section */}
            <div>
                <h3 className="font-semibold mb-2">3. List on Market</h3>
                <div className="flex gap-2 items-center">
                    <input
                        type="number"
                        placeholder="Price (Tokens)"
                        className="border p-2 rounded dark:bg-zinc-800"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                    />
                    <button
                        onClick={handleList}
                        disabled={isListPending || isListConfirming}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isListPending || isListConfirming ? 'Listing...' : 'List NFT'}
                    </button>
                </div>
                {isListSuccess && <p className="text-blue-500 text-sm mt-2">NFT Listed Successfully!</p>}
            </div>
        </div>
    )
}
