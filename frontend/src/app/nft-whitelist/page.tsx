'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWalletClient, usePublicClient } from 'wagmi'
import { formatEther, Address } from 'viem'

// 从环境变量读取合约地址
const JAC_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_JAC_TOKEN || '0x43FcFF4c6093C50E09376609b06E156CB5984E00') as Address
const JAC_NFT_ADDRESS = (process.env.NEXT_PUBLIC_JAC_NFT || '0xE845959F4A838f3114b52317f7BC6dA48B0De8e5') as Address
const NFT_MARKET_ADDRESS = (process.env.NEXT_PUBLIC_NFT_MARKET || '0x4da1B8900A066A8b6f2198b028FAE5635b6aE5ea') as Address

// ABIs
const NFT_MARKET_ABI = [
    { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'permitBuy', stateMutability: 'nonpayable', inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }], outputs: [] },
    { type: 'function', name: 'getListing', stateMutability: 'view', inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'seller', type: 'address' }, { name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }, { name: 'isActive', type: 'bool' }] }] },
] as const

const ERC20_ABI = [
    { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

export default function NFTWhitelistPage() {
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [isPurchasing, setIsPurchasing] = useState(false)
    const [status, setStatus] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Read NFT listing for token 0
    const { data: listing, refetch: refetchListing } = useReadContract({
        address: NFT_MARKET_ADDRESS,
        abi: NFT_MARKET_ABI,
        functionName: 'getListing',
        args: [JAC_NFT_ADDRESS, 0n],
    })

    // Read token balance
    const { data: tokenBalance } = useReadContract({
        address: JAC_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    // Read nonce
    const { data: nonce } = useReadContract({
        address: NFT_MARKET_ADDRESS,
        abi: NFT_MARKET_ABI,
        functionName: 'nonces',
        args: address ? [address] : undefined,
    })

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(false), 5000)
            return () => clearTimeout(timer)
        }
    }, [success])

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 10000)
            return () => clearTimeout(timer)
        }
    }, [error])

    // 一键购买：后端生成签名 + 前端执行交易
    const handleOneClickBuy = async () => {
        if (!address || !walletClient || !publicClient) {
            setError('请先连接钱包')
            return
        }

        setIsPurchasing(true)
        setError('')
        setStatus('检查 NFT 状态...')

        try {
            const nftListing = listing as any
            if (!nftListing?.isActive) {
                setError('NFT #0 未上架或已售出')
                setIsPurchasing(false)
                return
            }

            const currentNonce = nonce || 0n
            const deadline = Math.floor(Date.now() / 1000) + 36000 // 10 hours

            // 1. 调用后端 API 获取项目方签名
            setStatus('正在获取白名单签名...')
            const response = await fetch('/api/whitelist-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyer: address,
                    tokenId: 0,
                    nonce: currentNonce.toString(),
                    deadline: deadline.toString(),
                }),
            })

            const data = await response.json()
            if (!data.success) {
                throw new Error(data.error || 'Failed to get signature')
            }

            console.log('Got whitelist signature from server:', data)

            // 2. 授权代币
            setStatus('授权代币中...')
            const approveTx = await walletClient.writeContract({
                address: JAC_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [NFT_MARKET_ADDRESS, nftListing.price],
            })
            await publicClient.waitForTransactionReceipt({ hash: approveTx })

            // 3. 使用签名购买 NFT
            setStatus('购买 NFT 中...')
            const buyTx = await walletClient.writeContract({
                address: NFT_MARKET_ADDRESS,
                abi: NFT_MARKET_ABI,
                functionName: 'permitBuy',
                args: [
                    JAC_NFT_ADDRESS,
                    0n,
                    BigInt(deadline),
                    data.v,
                    data.r as `0x${string}`,
                    data.s as `0x${string}`,
                ],
                gas: 500000n,
            })
            await publicClient.waitForTransactionReceipt({ hash: buyTx })

            setSuccess(true)
            setStatus('')
            refetchListing()
        } catch (err: any) {
            console.error('Purchase failed:', err)
            setError(err.message || 'Purchase failed')
            setStatus('')
        } finally {
            setIsPurchasing(false)
        }
    }

    if (!isConnected) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">请连接钱包</h2>
            </div>
        )
    }

    const nftListing = listing as any

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">NFT 白名单购买</h1>
                <p className="text-gray-600">使用 EIP-712 签名购买限量 NFT（后端自动授权签名）</p>
            </div>

            {/* 余额信息 */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-indigo-100 text-sm">你的 JAC 余额</p>
                        <p className="text-2xl font-bold">{tokenBalance ? formatEther(tokenBalance) : '0'} JAC</p>
                    </div>
                    <div>
                        <p className="text-indigo-100 text-sm">你的 Nonce</p>
                        <p className="text-2xl font-bold">{nonce?.toString() || '0'}</p>
                    </div>
                </div>
            </div>

            {/* NFT 信息 */}
            {nftListing && (
                <div className="bg-white rounded-lg border p-6">
                    <h3 className="font-bold text-lg mb-4">NFT #0 详情</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>价格:</span>
                            <span className="font-bold text-indigo-600">{formatEther(nftListing.price || 0n)} JAC</span>
                        </div>
                        <div className="flex justify-between">
                            <span>状态:</span>
                            <span className={nftListing.isActive ? 'text-green-600 font-bold' : 'text-red-600'}>
                                {nftListing.isActive ? '✅ 可购买' : '❌ 已售出'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>卖家:</span>
                            <span className="font-mono text-xs">{nftListing.seller?.slice(0, 10)}...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-bold mb-2">🔐 工作流程：</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>你点击购买按钮</li>
                    <li>后端使用项目方私钥为你生成白名单签名</li>
                    <li>你授权代币（需确认交易）</li>
                    <li>使用签名完成 NFT 购买（需确认交易）</li>
                </ol>
            </div>

            {/* 购买按钮 */}
            <button
                onClick={handleOneClickBuy}
                disabled={isPurchasing || !nftListing?.isActive}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
          ${isPurchasing || !nftListing?.isActive
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                    }`}
            >
                {isPurchasing ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {status || '处理中...'}
                    </>
                ) : nftListing?.isActive ? (
                    <>⚡ 一键购买 NFT #0</>
                ) : (
                    <>🔒 NFT 不可购买</>
                )}
            </button>

            {/* 错误提示 */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ❌ {error}
                </div>
            )}

            {/* 成功提示 */}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    ✅ NFT 购买成功！恭喜你获得 NFT #0！
                </div>
            )}
        </div>
    )
}
