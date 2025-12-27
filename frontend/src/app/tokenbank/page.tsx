'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { TOKEN_BANK_ADDRESS, TOKEN_BANK_ABI, ERC20_TOKEN_ADDRESS, ERC20_TOKEN_ABI } from '@/config/abis'
import { useEIP7702 } from '@/hooks/useEIP7702'

export default function TokenBankPage() {
    const { address, isConnected } = useAccount()
    const [depositAmount, setDepositAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [eip7702Error, setEip7702Error] = useState<string | null>(null)
    const [eip7702Success, setEip7702Success] = useState(false)

    // EIP-7702 Hook (uses wallet_sendCalls / EIP-5792)
    const {
        isSupported: isEIP7702Supported,
        isExecuting,
        executeApproveAndDeposit,
        waitForCallsConfirmation,
        checkSupport,
        error: eip7702HookError
    } = useEIP7702()

    // Check EIP-7702/EIP-5792 support on mount
    useEffect(() => {
        checkSupport()
    }, [checkSupport])

    // Read Balance from Token Contract
    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: ERC20_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    // Read Deposit Balance from TokenBank Contract
    const { data: bankBalance, refetch: refetchBankBalance } = useReadContract({
        address: TOKEN_BANK_ADDRESS as `0x${string}`,
        abi: TOKEN_BANK_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    const { writeContract: deposit, data: depositHash, isPending: isDepositPending } = useWriteContract()
    const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract()

    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
        hash: depositHash,
    })

    const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
        hash: withdrawHash,
    })

    useEffect(() => {
        if (isDepositSuccess || isWithdrawSuccess || eip7702Success) {
            refetchTokenBalance()
            refetchBankBalance()
            setDepositAmount('')
            setWithdrawAmount('')
        }
    }, [isDepositSuccess, isWithdrawSuccess, eip7702Success, refetchTokenBalance, refetchBankBalance])

    // Clear EIP-7702 success after 3 seconds
    useEffect(() => {
        if (eip7702Success) {
            const timer = setTimeout(() => setEip7702Success(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [eip7702Success])

    // Clear EIP-7702 error after 5 seconds
    useEffect(() => {
        if (eip7702Error) {
            const timer = setTimeout(() => setEip7702Error(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [eip7702Error])

    // Traditional deposit using transferWithCallback
    const handleDeposit = () => {
        if (!depositAmount) return
        try {
            deposit({
                address: ERC20_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_TOKEN_ABI,
                functionName: 'transferWithCallback',
                args: [TOKEN_BANK_ADDRESS as `0x${string}`, parseEther(depositAmount)],
            })
        } catch (error) {
            console.error('Deposit failed:', error)
        }
    }

    // EIP-7702 One-Click Deposit (approve + deposit in single tx via wallet_sendCalls)
    const handleEIP7702Deposit = async () => {
        if (!depositAmount) return
        setEip7702Error(null)

        try {
            // Execute batch call - MetaMask handles EIP-7702 internally
            const result = await executeApproveAndDeposit(depositAmount)

            if (result.success && result.id) {
                // Wait for confirmation
                const confirmation = await waitForCallsConfirmation(result.id)

                if (confirmation.success) {
                    setEip7702Success(true)
                    refetchTokenBalance()
                    refetchBankBalance()
                    setDepositAmount('')
                } else {
                    setEip7702Error('Transaction failed or timed out')
                }
            }
        } catch (error: unknown) {
            console.error('EIP-7702 deposit failed:', error)

            // Provide helpful error message
            let errorMessage = 'Transaction failed'
            if (error instanceof Error) {
                errorMessage = error.message
            } else if (typeof error === 'object' && error !== null) {
                const errObj = error as { message?: string; code?: number }
                if (errObj.message) {
                    errorMessage = errObj.message
                } else if (errObj.code === -32601 || errObj.code === 4200) {
                    errorMessage = '钱包不支持 wallet_sendCalls 方法。请使用下方的传统存款方式，或使用 CLI 脚本测试 EIP-7702。'
                }
            }

            // If error is empty object or generic, provide helpful fallback
            if (errorMessage === 'Transaction failed' || errorMessage === '{}') {
                errorMessage = '钱包暂不支持 EIP-7702 批量交易。请使用传统存款方式，或通过 CLI 脚本 (npm run dev -- eip7702-deposit) 测试。'
            }

            setEip7702Error(errorMessage)
        }
    }

    const handleWithdraw = () => {
        if (!withdrawAmount) return
        try {
            withdraw({
                address: TOKEN_BANK_ADDRESS as `0x${string}`,
                abi: TOKEN_BANK_ABI,
                functionName: 'withdraw',
                args: [parseEther(withdrawAmount)],
            })
        } catch (error) {
            console.error('Withdraw failed:', error)
        }
    }

    if (!isConnected) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">Please connect your wallet to use TokenBank</h2>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Token Bank</h1>
                <p className="text-gray-600">Deposit and withdraw tokens secure and fast.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Balance Info */}
                <div className="md:col-span-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
                    <h2 className="text-2xl font-bold mb-6">Your Balances</h2>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Wallet Balance</p>
                            <p className="text-4xl font-bold mt-2">
                                {tokenBalance ? formatEther(tokenBalance) : '0'} Tokens
                            </p>
                        </div>
                        <div>
                            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Bank Deposit</p>
                            <p className="text-4xl font-bold mt-2">
                                {bankBalance ? formatEther(bankBalance) : '0'} Tokens
                            </p>
                        </div>
                    </div>
                </div>

                {/* EIP-7702 One-Click Deposit Section */}
                {isEIP7702Supported && (
                    <div className="md:col-span-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">⚡</span>
                            <div>
                                <h2 className="text-xl font-bold">EIP-7702 一键存款</h2>
                                <p className="text-purple-100 text-sm">
                                    批量交易：在单笔交易中完成授权和存款 (approve + deposit)
                                </p>
                            </div>
                            <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                                实验性功能
                            </span>
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-purple-100 mb-1">存款金额</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className="block w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-200 pl-4 pr-16 py-3 focus:ring-2 focus:ring-white/50 focus:border-transparent"
                                        placeholder="0.0"
                                        min="0"
                                        step="0.000000000000000001"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <span className="text-purple-200 text-sm">Tokens</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleEIP7702Deposit}
                                disabled={isExecuting || !depositAmount}
                                className={`px-8 py-3 rounded-lg font-medium shadow-lg transition-all flex items-center gap-2
                                    ${isExecuting || !depositAmount
                                        ? 'bg-white/30 cursor-not-allowed text-white/70'
                                        : 'bg-white text-purple-600 hover:bg-purple-50 hover:shadow-xl active:transform active:scale-[0.98]'
                                    }
                                `}
                            >
                                {isExecuting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        执行中...
                                    </>
                                ) : (
                                    <>
                                        ⚡ 一键存款
                                    </>
                                )}
                            </button>
                        </div>

                        {(eip7702Error || eip7702HookError) && (
                            <div className="mt-4 bg-red-500/20 border border-red-300/30 rounded-lg px-4 py-2 text-sm">
                                ❌ {eip7702Error || eip7702HookError}
                            </div>
                        )}

                        <div className="mt-4 text-xs text-purple-200 flex items-center gap-2">
                            <span>ℹ️</span>
                            <span>EIP-7702 允许您的 EOA 临时获得智能合约功能，实现单笔交易完成多个操作</span>
                        </div>
                    </div>
                )}

                {/* Traditional Deposit Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📥</span> Deposit Tokens
                        {isEIP7702Supported && (
                            <span className="text-xs font-normal text-gray-400 ml-2">(传统方式)</span>
                        )}
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">
                        {isEIP7702Supported
                            ? '使用 transferWithCallback 直接存款（无需单独授权）'
                            : 'Transfer tokens from your wallet to the bank using transferWithCallback.'
                        }
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Deposit</label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pl-4 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 border"
                                    placeholder="0.0"
                                    min="0"
                                    step="0.000000000000000001"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">Tokens</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDeposit}
                            disabled={isDepositPending || isDepositConfirming || !depositAmount}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-sm transition-all
                                ${isDepositPending || isDepositConfirming || !depositAmount
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-[0.98]'
                                }
                            `}
                        >
                            {isDepositPending ? 'Confirm in Wallet...' :
                                isDepositConfirming ? 'Depositing...' :
                                    'Deposit'}
                        </button>
                    </div>
                </div>

                {/* Withdraw Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📤</span> Withdraw Tokens
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">Withdraw your deposited tokens back to your wallet.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw</label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pl-4 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 border"
                                    placeholder="0.0"
                                    min="0"
                                    step="0.000000000000000001"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">Tokens</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleWithdraw}
                            disabled={isWithdrawPending || isWithdrawConfirming || !withdrawAmount}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-sm transition-all
                                ${isWithdrawPending || isWithdrawConfirming || !withdrawAmount
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:transform active:scale-[0.98]'
                                }
                            `}
                        >
                            {isWithdrawPending ? 'Confirm in Wallet...' :
                                isWithdrawConfirming ? 'Withdrawing...' :
                                    'Withdraw'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Notifications */}
            {(isDepositSuccess || isWithdrawSuccess || eip7702Success) && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-lg border animate-slide-up flex items-center gap-2
                    ${eip7702Success
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }
                `}>
                    <span className="text-xl">{eip7702Success ? '⚡' : '✅'}</span>
                    <div>
                        <p className="font-bold">
                            {eip7702Success ? 'EIP-7702 交易成功!' : 'Transaction Successful!'}
                        </p>
                        <p className="text-sm">Your balance has been updated.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
