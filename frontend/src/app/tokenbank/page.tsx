'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { TOKEN_BANK_ADDRESS, TOKEN_BANK_ABI, ERC20_TOKEN_ADDRESS, ERC20_TOKEN_ABI } from '@/config/abis'

export default function TokenBankPage() {
    const { address, isConnected } = useAccount()
    const [depositAmount, setDepositAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')

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
        if (isDepositSuccess || isWithdrawSuccess) {
            refetchTokenBalance()
            refetchBankBalance()
            setDepositAmount('')
            setWithdrawAmount('')
        }
    }, [isDepositSuccess, isWithdrawSuccess, refetchTokenBalance, refetchBankBalance])

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

                {/* Deposit Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📥</span> Deposit Tokens
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">Transfer tokens from your wallet to the bank using transferWithCallback.</p>

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

            {(isDepositSuccess || isWithdrawSuccess) && (
                <div className="fixed bottom-4 right-4 bg-green-50 text-green-700 px-6 py-4 rounded-lg shadow-lg border border-green-200 animate-slide-up flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <div>
                        <p className="font-bold">Transaction Successful!</p>
                        <p className="text-sm">Your balance has been updated.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
