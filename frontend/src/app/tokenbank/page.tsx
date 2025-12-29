'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWalletClient, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, Address, maxUint256 } from 'viem'
import { TOKENS, BANKS, JAC_TOKEN_ABI, ERC20_TOKEN_ABI, TOKEN_BANK_UNIFIED_ABI, PERMIT2_ADDRESS } from '@/config/abis'
import { useEIP7702 } from '@/hooks/useEIP7702'
import Link from 'next/link'

type TokenType = 'JAC' | 'ERC20'

export default function UnifiedTokenBankPage() {
    const { address, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    // Token selection
    const [selectedToken, setSelectedToken] = useState<TokenType>('JAC')

    // Form state
    const [depositAmount, setDepositAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')

    // UI state
    const [isProcessing, setIsProcessing] = useState(false)
    const [txHash, setTxHash] = useState<string>('')
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState(false)

    // EIP-7702 Hook
    const {
        isSupported: isEIP7702Supported,
        isExecuting,
        executeApproveAndDeposit,
        waitForCallsConfirmation,
        checkSupport,
    } = useEIP7702()

    // Derived values based on token selection
    const tokenConfig = TOKENS[selectedToken]
    const bankAddress = selectedToken === 'JAC' ? BANKS.JAC : BANKS.ERC20
    const tokenAbi = selectedToken === 'JAC' ? JAC_TOKEN_ABI : ERC20_TOKEN_ABI

    // Check EIP-7702 support on mount
    useEffect(() => {
        checkSupport()
    }, [checkSupport])

    // Read token balance
    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: tokenConfig.address as Address,
        abi: tokenAbi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    // Read bank balance
    const { data: bankBalance, refetch: refetchBankBalance } = useReadContract({
        address: bankAddress as Address,
        abi: TOKEN_BANK_UNIFIED_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    })

    // Read nonce for JAC Token (EIP-2612)
    const { data: nonce } = useReadContract({
        address: TOKENS.JAC.address as Address,
        abi: JAC_TOKEN_ABI,
        functionName: 'nonces',
        args: address ? [address] : undefined,
        query: { enabled: selectedToken === 'JAC' }
    })

    // Read token name for JAC
    const { data: tokenName } = useReadContract({
        address: TOKENS.JAC.address as Address,
        abi: JAC_TOKEN_ABI,
        functionName: 'name',
        query: { enabled: selectedToken === 'JAC' }
    })

    // Check Permit2 allowance
    const { data: permit2Allowance, refetch: refetchPermit2Allowance } = useReadContract({
        address: tokenConfig.address as Address,
        abi: ERC20_TOKEN_ABI,
        functionName: 'allowance',
        args: address ? [address, PERMIT2_ADDRESS as Address] : undefined,
    })

    const hasPermit2Approval = permit2Allowance && BigInt(permit2Allowance.toString()) > 0n

    // Write contract hooks
    const { writeContract: deposit, data: depositHash, isPending: isDepositPending } = useWriteContract()
    const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract()
    const { writeContract: approvePermit2, data: approveHash, isPending: isApprovePending } = useWriteContract()

    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
        hash: depositHash,
    })

    const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
        hash: withdrawHash,
    })

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    })

    // Clear notifications
    useEffect(() => {
        if (success || isDepositSuccess || isWithdrawSuccess || isApproveSuccess) {
            refetchTokenBalance()
            refetchBankBalance()
            refetchPermit2Allowance()
            setDepositAmount('')
            setWithdrawAmount('')
            const timer = setTimeout(() => {
                setSuccess(false)
                setTxHash('')
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [success, isDepositSuccess, isWithdrawSuccess, isApproveSuccess, refetchTokenBalance, refetchBankBalance, refetchPermit2Allowance])

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000)
            return () => clearTimeout(timer)
        }
    }, [error])

    // Approve Permit2
    const handleApprovePermit2 = () => {
        approvePermit2({
            address: tokenConfig.address as Address,
            abi: ERC20_TOKEN_ABI,
            functionName: 'approve',
            args: [PERMIT2_ADDRESS as Address, maxUint256],
        })
    }

    // Traditional deposit using transferWithCallback (ERC20 only)
    const handleCallbackDeposit = () => {
        if (!depositAmount) return
        deposit({
            address: tokenConfig.address as Address,
            abi: ERC20_TOKEN_ABI,
            functionName: 'transferWithCallback',
            args: [bankAddress as Address, parseEther(depositAmount)],
        })
    }

    // EIP-2612 Permit Deposit (JAC only)
    const handlePermitDeposit = async () => {
        if (!depositAmount || !address || !walletClient || !publicClient) return

        setIsProcessing(true)
        setError('')

        try {
            const amount = parseEther(depositAmount)
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
            const chainId = await publicClient.getChainId()

            // EIP-712 Domain
            const domain = {
                name: tokenName || 'Jac Token',
                version: '1',
                chainId: chainId,
                verifyingContract: TOKENS.JAC.address as Address,
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
                spender: bankAddress as Address,
                value: amount,
                nonce: nonce || 0n,
                deadline,
            }

            // Request signature
            const signature = await walletClient.signTypedData({
                account: address,
                domain,
                types,
                primaryType: 'Permit',
                message,
            })

            // Parse signature
            const r = signature.slice(0, 66) as `0x${string}`
            const s = ('0x' + signature.slice(66, 130)) as `0x${string}`
            const v = parseInt(signature.slice(130, 132), 16)

            // Call permitDeposit
            const hash = await walletClient.writeContract({
                address: bankAddress as Address,
                abi: TOKEN_BANK_UNIFIED_ABI,
                functionName: 'permitDeposit',
                args: [amount, deadline, v, r, s],
            })

            setTxHash(hash)
            await publicClient.waitForTransactionReceipt({ hash })
            setSuccess(true)
            refetchTokenBalance()
            refetchBankBalance()
            setDepositAmount('')
        } catch (err: any) {
            console.error('Permit deposit failed:', err)
            setError(err.message || 'Transaction failed')
        } finally {
            setIsProcessing(false)
        }
    }

    // Permit2 Deposit
    const handlePermit2Deposit = async () => {
        if (!depositAmount || !address || !walletClient || !publicClient) return

        setIsProcessing(true)
        setError('')

        try {
            const amount = parseEther(depositAmount)
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
            const nonce = BigInt(Math.floor(Math.random() * 2 ** 48))
            const chainId = await publicClient.getChainId()

            // EIP-712 Domain for Permit2
            const domain = {
                name: 'Permit2',
                chainId: chainId,
                verifyingContract: PERMIT2_ADDRESS as Address,
            }

            const types = {
                PermitTransferFrom: [
                    { name: 'permitted', type: 'TokenPermissions' },
                    { name: 'spender', type: 'address' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                ],
                TokenPermissions: [
                    { name: 'token', type: 'address' },
                    { name: 'amount', type: 'uint256' },
                ],
            }

            const message = {
                permitted: {
                    token: tokenConfig.address as Address,
                    amount: amount,
                },
                spender: bankAddress as Address,
                nonce: nonce,
                deadline: deadline,
            }

            // Request signature
            const signature = await walletClient.signTypedData({
                account: address,
                domain,
                types,
                primaryType: 'PermitTransferFrom',
                message,
            })

            // Construct permitTransfer struct
            const permitTransfer = {
                permitted: {
                    token: tokenConfig.address as Address,
                    amount: amount,
                },
                nonce: nonce,
                deadline: deadline,
            }

            // Call depositWithPermit2
            const hash = await walletClient.writeContract({
                address: bankAddress as Address,
                abi: TOKEN_BANK_UNIFIED_ABI,
                functionName: 'depositWithPermit2',
                args: [permitTransfer, address, signature],
            })

            setTxHash(hash)
            await publicClient.waitForTransactionReceipt({ hash })
            setSuccess(true)
            refetchTokenBalance()
            refetchBankBalance()
            setDepositAmount('')
        } catch (err: any) {
            console.error('Permit2 deposit failed:', err)
            setError(err.message || 'Transaction failed')
        } finally {
            setIsProcessing(false)
        }
    }

    // EIP-7702 Batch Deposit
    const handleEIP7702Deposit = async () => {
        if (!depositAmount) return
        setError('')

        try {
            const result = await executeApproveAndDeposit(depositAmount)
            if (result.success && result.id) {
                const confirmation = await waitForCallsConfirmation(result.id)
                if (confirmation.success) {
                    setSuccess(true)
                    refetchTokenBalance()
                    refetchBankBalance()
                    setDepositAmount('')
                } else {
                    setError('Transaction failed or timed out')
                }
            }
        } catch (err: any) {
            console.error('EIP-7702 deposit failed:', err)
            setError(err.message || 'Transaction failed')
        }
    }

    // Withdraw
    const handleWithdraw = () => {
        if (!withdrawAmount) return
        withdraw({
            address: bankAddress as Address,
            abi: TOKEN_BANK_UNIFIED_ABI,
            functionName: 'withdraw',
            args: [parseEther(withdrawAmount)],
        })
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
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Token Bank Unified</h1>
                    <p className="text-gray-600">Deposit and withdraw tokens using multiple methods</p>
                </div>
                <Link
                    href="/transfers"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                >
                    <span>📜</span>
                    View Activity
                </Link>
            </div>

            {/* Token Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Token</label>
                <div className="flex gap-4">
                    {(Object.keys(TOKENS) as TokenType[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setSelectedToken(key)}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${selectedToken === key
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <div>{TOKENS[key].name}</div>
                            <div className="text-xs opacity-75">{TOKENS[key].symbol}</div>
                        </button>
                    ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                    {tokenConfig.supportsPermit && <span className="mr-3">✓ EIP-2612 Permit</span>}
                    {tokenConfig.supportsCallback && <span className="mr-3">✓ Callback</span>}
                    <span>✓ Permit2</span>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">Your Balances ({tokenConfig.symbol})</h2>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Wallet Balance</p>
                        <p className="text-4xl font-bold mt-2">
                            {tokenBalance ? formatEther(tokenBalance as bigint) : '0'} {tokenConfig.symbol}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Bank Deposit</p>
                        <p className="text-4xl font-bold mt-2">
                            {bankBalance ? formatEther(bankBalance as bigint) : '0'} {tokenConfig.symbol}
                        </p>
                    </div>
                </div>
            </div>

            {/* Permit2 Approval Notice */}
            {!hasPermit2Approval && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                            <p className="font-medium text-yellow-800">需要授权 Permit2 才能使用 Permit2 存款</p>
                            <p className="text-sm text-yellow-600">一次性授权，之后可用签名方式存款</p>
                        </div>
                        <button
                            onClick={handleApprovePermit2}
                            disabled={isApprovePending || isApproveConfirming}
                            className={`px-4 py-2 rounded-lg font-medium ${isApprovePending || isApproveConfirming
                                ? 'bg-yellow-300 text-yellow-600'
                                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                        >
                            {isApprovePending ? '确认中...' : isApproveConfirming ? '授权中...' : '授权 Permit2'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Deposit Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📥</span> Deposit Tokens
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Deposit</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 pl-4 pr-16 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 border"
                                    placeholder="0.0"
                                    min="0"
                                    step="0.000000000000000001"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">{tokenConfig.symbol}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deposit Methods */}
                        <div className="space-y-2">
                            {/* EIP-2612 Permit (JAC only) */}
                            {tokenConfig.supportsPermit && (
                                <button
                                    onClick={handlePermitDeposit}
                                    disabled={isProcessing || !depositAmount}
                                    className={`w-full py-3 px-4 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isProcessing || !depositAmount
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                                        }`}
                                >
                                    {isProcessing ? '处理中...' : '⚡ EIP-2612 Permit Deposit'}
                                </button>
                            )}

                            {/* Permit2 Deposit */}
                            {hasPermit2Approval && (
                                <button
                                    onClick={handlePermit2Deposit}
                                    disabled={isProcessing || !depositAmount}
                                    className={`w-full py-3 px-4 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isProcessing || !depositAmount
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700'
                                        }`}
                                >
                                    {isProcessing ? '处理中...' : '🔐 Permit2 Deposit'}
                                </button>
                            )}

                            {/* TransferWithCallback (ERC20 only) */}
                            {tokenConfig.supportsCallback && (
                                <button
                                    onClick={handleCallbackDeposit}
                                    disabled={isDepositPending || isDepositConfirming || !depositAmount}
                                    className={`w-full py-3 px-4 rounded-lg font-medium shadow-sm transition-all
                                        ${isDepositPending || isDepositConfirming || !depositAmount
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isDepositPending ? '确认中...' : isDepositConfirming ? '处理中...' : '📥 Callback Deposit'}
                                </button>
                            )}

                            {/* EIP-7702 (if supported) */}
                            {isEIP7702Supported && selectedToken === 'ERC20' && (
                                <button
                                    onClick={handleEIP7702Deposit}
                                    disabled={isExecuting || !depositAmount}
                                    className={`w-full py-3 px-4 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2
                                        ${isExecuting || !depositAmount
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700'
                                        }`}
                                >
                                    {isExecuting ? '执行中...' : '🚀 EIP-7702 Batch Deposit'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Withdraw Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📤</span> Withdraw Tokens
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw</label>
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
                                    <span className="text-gray-500 sm:text-sm">{tokenConfig.symbol}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleWithdraw}
                            disabled={isWithdrawPending || isWithdrawConfirming || !withdrawAmount}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-sm transition-all
                                ${isWithdrawPending || isWithdrawConfirming || !withdrawAmount
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {isWithdrawPending ? '确认中...' : isWithdrawConfirming ? '处理中...' : 'Withdraw'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contract Info */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
                <p><strong>Token:</strong> {tokenConfig.address}</p>
                <p><strong>TokenBankUnified:</strong> {bankAddress}</p>
                <p><strong>Permit2:</strong> {PERMIT2_ADDRESS}</p>
            </div>

            {/* Success Notification */}
            {(success || isDepositSuccess || isWithdrawSuccess || isApproveSuccess) && (
                <div className="fixed bottom-4 right-4 bg-green-50 text-green-700 border border-green-200 px-6 py-4 rounded-lg shadow-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">✅</span>
                        <div>
                            <p className="font-bold">Transaction Successful!</p>
                            <p className="text-sm">Your balance has been updated.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Notification */}
            {error && (
                <div className="fixed bottom-4 right-4 bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-lg shadow-lg max-w-md">
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
