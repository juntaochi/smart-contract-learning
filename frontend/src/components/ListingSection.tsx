'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { MARKET_ABI, NFT_ABI, NFT_ADDRESS, MARKET_ADDRESS } from '@/config/constants'

export default function ListingSection() {
    const { address } = useAccount()

    const [tokenId, setTokenId] = useState('')
    const [price, setPrice] = useState('')

    // 1. Mint NFT
    const { writeContract: mintNFT, data: mintHash, isPending: isMintPending } = useWriteContract()
    const { isLoading: isMintConfirming, isSuccess: isMintSuccess, data: mintReceipt } = useWaitForTransactionReceipt({ hash: mintHash })

    // Auto-fill Token ID after minting
    useEffect(() => {
        if (isMintSuccess && mintReceipt) {
            // Find Transfer event logs: Topic0 is Transfer signature. 
            // For standard ERC721, Transfer(from, to, tokenId) are all indexed.
            // topics[3] is tokenId.
            const transferLog = mintReceipt.logs.find(log => log.topics.length === 4)
            if (transferLog && transferLog.topics[3]) {
                const id = parseInt(transferLog.topics[3], 16).toString()
                setTokenId(id)
            }
        }
    }, [isMintSuccess, mintReceipt])

    // 2. Approve Market

    // 2. Approve Market
    const { writeContract: approveNFT, data: approveHash, isPending: isApprovePending } = useWriteContract()
    const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveHash })

    // 3. List Item
    const { writeContract: listNFT, data: listHash, isPending: isListPending } = useWriteContract()
    const { isLoading: isListConfirming, isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash })

    const handleMint = async () => {
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
        <div className="p-6 space-y-8">

            {/* Step 1: Mint */}
            <div className="relative pl-8 border-l-2 border-green-100 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-green-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Get Test NFT</h3>
                <p className="text-sm text-gray-500 mb-4">Mint a free TestNFT to start listing.</p>
                <button
                    onClick={handleMint}
                    disabled={isMintPending || isMintConfirming}
                    className="w-full sm:w-auto px-6 py-2.5 bg-green-600/10 text-green-700 font-medium rounded-lg hover:bg-green-600/20 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isMintPending ? 'Confirming...' : isMintConfirming ? 'Minting...' : 'Mint New NFT'}
                </button>
                {isMintSuccess && <div className="mt-3 p-3 bg-green-50 text-green-700 text-sm rounded-lg animate-fade-in">Test NFT Minted Successfully!</div>}
            </div>

            {/* Step 2: Approve */}
            <div className="relative pl-8 border-l-2 border-yellow-100 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-yellow-400 ring-4 ring-yellow-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Approve Market</h3>
                <p className="text-sm text-gray-500 mb-4">Authorize the market to sell your NFT.</p>
                <div className="flex gap-3">
                    <input
                        type="number"
                        placeholder="Token ID"
                        className="flex-1 min-w-0 resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-100 transition"
                        value={tokenId}
                        onChange={e => setTokenId(e.target.value)}
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

            {/* Step 3: List */}
            <div className="relative pl-8">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. List on Market</h3>
                <p className="text-sm text-gray-500 mb-4">Set your price and list it for sale.</p>
                <div className="flex gap-3 items-center">
                    <input
                        type="number"
                        placeholder="Price (Tokens)"
                        className="flex-1 min-w-0 resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                    />
                    <button
                        onClick={handleList}
                        disabled={isListPending || isListConfirming}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-200 disabled:opacity-50"
                    >
                        {isListPending || isListConfirming ? 'Listing...' : 'List NFT'}
                    </button>
                </div>
                {isListSuccess && <div className="mt-3 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg animate-fade-in">NFT Listed Successfully!</div>}
            </div>
        </div>
    )
}
