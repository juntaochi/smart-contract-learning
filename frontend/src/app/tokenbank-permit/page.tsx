'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, formatEther, encodeFunctionData, keccak256, toBytes, Address } from 'viem'

// Sepolia 部署的合约地址
const JAC_TOKEN_ADDRESS = '0x43FcFF4c6093C50E09376609b06E156CB5984E00' as Address
const TOKEN_BANK_ADDRESS = '0xFAf11f295E3EBf00911C969D67DE5aa05544418b' as Address

// JacToken ABI (ERC20Permit)
const JAC_TOKEN_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'nonces',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'DOMAIN_SEPARATOR',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bytes32' }],
    },
    {
        type: 'function',
        name: 'permit',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'v', type: 'uint8' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'name',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
] as const

// TokenBankV2 ABI
const TOKEN_BANK_ABI = [
    {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'permitDeposit',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'v', type: 'uint8' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'withdraw',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
    },
] as const

export default function TokenBankPermitPage() {
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [depositAmount, setDepositAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [isSigningAndDepositing, setIsSigningAndDepositing] = useState(false)
    const [txHash, setTxHash] = useState<string>('')
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState(false)

    // Read token balance
    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: JAC_TOKEN_ADDRESS,
        abi: JAC_TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    // Read bank balance
    const { data: bankBalance, refetch: refetchBankBalance } = useReadContract({
        address: TOKEN_BANK_ADDRESS,
        abi: TOKEN_BANK_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    // Read nonce
    const { data: nonce } = useReadContract({
        address: JAC_TOKEN_ADDRESS,
        abi: JAC_TOKEN_ABI,
        functionName: 'nonces',
        args: address ? [address] : undefined,
    })

    // Read domain separator
    const { data: domainSeparator } = useReadContract({
        address: JAC_TOKEN_ADDRESS,
        abi: JAC_TOKEN_ABI,
        functionName: 'DOMAIN_SEPARATOR',
    })

    // Read token name
    const { data: tokenName } = useReadContract({
        address: JAC_TOKEN_ADDRESS,
        abi: JAC_TOKEN_ABI,
        functionName: 'name',
    })

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess(false)
                setTxHash('')
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [success])

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000)
            return () => clearTimeout(timer)
        }
    }, [error])

    const handlePermitDeposit = async () => {
        if (!depositAmount || !address || !walletClient || !publicClient) return

        setIsSigningAndDepositing(true)
        setError('')

        try {
            const amount = parseEther(depositAmount)
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now

            // EIP-712 Permit 签名
            const domain = {
                name: tokenName || 'Jac Token',
                version: '1',
                chainId: await publicClient.getChainId(),
                verifyingContract: JAC_TOKEN_ADDRESS,
            }

            const types = {
                Permit: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                ],
            }

            const message = {
                owner: address,
                spender: TOKEN_BANK_ADDRESS,
                value: amount,
                nonce: nonce || 0n,
                deadline,
            }

            // 请求用户签名
            const signature = await walletClient.signTypedData({
                account: address,
                domain,
                types,
                primaryType: 'Permit',
                message,
            })

            // 分离签名
            const r = signature.slice(0, 66) as `0x${string}`
            const s = ('0x' + signature.slice(66, 130)) as `0x${string}`
            const v = parseInt(signature.slice(130, 132), 16)

            // 调用 permitDeposit
            const hash = await walletClient.writeContract({
                address: TOKEN_BANK_ADDRESS,
                abi: TOKEN_BANK_ABI,
                functionName: 'permitDeposit',
                args: [amount, deadline, v, r, s],
            })

            setTxHash(hash)

            // 等待交易确认
            await publicClient.waitForTransactionReceipt({ hash })

            setSuccess(true)
            setDepositAmount('')
            refetchTokenBalance()
            refetchBankBalance()
        } catch (err: any) {
            console.error('Permit deposit failed:', err)
            setError(err.message || 'Transaction failed')
        } finally {
            setIsSigningAndDepositing(false)
        }
    }

    const handleWithdraw = async () => {
        if (!withdrawAmount || !address || !walletClient || !publicClient) return

        try {
            const amount = parseEther(withdrawAmount)
            const hash = await walletClient.writeContract({
                address: TOKEN_BANK_ADDRESS,
                abi: TOKEN_BANK_ABI,
                functionName: 'withdraw',
                args: [amount],
            })

            await publicClient.waitForTransactionReceipt({ hash })

            setSuccess(true)
            setWithdrawAmount('')
            refetchTokenBalance()
            refetchBankBalance()
        } catch (err: any) {
            console.error('Withdraw failed:', err)
            setError(err.message || 'Withdraw failed')
        }
    }

    if (!isConnected) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">
                    Please connect your wallet to use TokenBank Permit
                </h2>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    TokenBank with EIP-712 Permit
                </h1>
                <p className="text-gray-600">
                    使用链下签名一步完成授权和存款，节省 gas 费用
                </p>
            </div>

            {/* 余额卡片 */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">Your Balances</h2>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-purple-100 text-sm font-medium uppercase tracking-wider">
                            Wallet Balance
                        </p>
                        <p className="text-4xl font-bold mt-2">
                            {tokenBalance ? formatEther(tokenBalance) : '0'} JAC
                        </p>
                    </div>
                    <div>
                        <p className="text-purple-100 text-sm font-medium uppercase tracking-wider">
                            Bank Deposit
                        </p>
                        <p className="text-4xl font-bold mt-2">
                            {bankBalance ? formatEther(bankBalance) : '0'} JAC
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Permit 存款卡片 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">⚡</span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Permit Deposit</h2>
                            <p className="text-sm text-gray-500">
                                链下签名 + 一笔交易完成存款
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount to Deposit
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pl-4 pr-16 focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-3 border"
                                    placeholder="0.0"
                                    min="0"
                                    step="0.000000000000000001"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">JAC</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handlePermitDeposit}
                            disabled={isSigningAndDepositing || !depositAmount}
                            className={`w-full py-3 px-4 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2
                ${isSigningAndDepositing || !depositAmount
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-md'
                                }
              `}
                        >
                            {isSigningAndDepositing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>⚡ Sign & Deposit</>
                            )}
                        </button>

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                            <p className="font-semibold mb-1">工作原理：</p>
                            <ol className="list-decimal list-inside space-y-1 text-purple-600">
                                <li>你在钱包中签名授权（免费，不发交易）</li>
                                <li>合约使用签名完成授权和存款（一笔交易）</li>
                                <li>相比传统方式节省一笔 approve 交易</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* 提取卡片 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📤</span> Withdraw Tokens
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">
                        Withdraw your deposited tokens back to your wallet.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount to Withdraw
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pl-4 pr-16 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 border"
                                    placeholder="0.0"
                                    min="0"
                                    step="0.000000000000000001"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">JAC</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleWithdraw}
                            disabled={!withdrawAmount}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-sm transition-all
                ${!withdrawAmount
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
                                }
              `}
                        >
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>

            {/* 成功通知 */}
            {success && (
                <div className="fixed bottom-4 right-4 bg-green-50 text-green-700 border border-green-200 px-6 py-4 rounded-lg shadow-lg animate-slide-up">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">✅</span>
                        <div>
                            <p className="font-bold">Transaction Successful!</p>
                            <p className="text-sm">Your balance has been updated.</p>
                            {txHash && (
                                <p className="text-xs mt-1 opacity-70">Tx: {txHash.slice(0, 10)}...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 错误通知 */}
            {error && (
                <div className="fixed bottom-4 right-4 bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-lg shadow-lg animate-slide-up max-w-md">
                    <div className="flex items-start gap-2">
                        <span className="text-xl">❌</span>
                        <div className="flex-1">
                            <p className="font-bold">Transaction Failed</p>
                            <p className="text-sm mt-1 break-words">{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
