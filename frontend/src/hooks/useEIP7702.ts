'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import {
    encodeFunctionData,
    parseEther,
    type Address,
    type Hash
} from 'viem'
import {
    ERC20_TOKEN_ABI,
    ERC20_TOKEN_ADDRESS,
    TOKEN_BANK_ABI,
    TOKEN_BANK_ADDRESS
} from '@/config/abis'

// Types for batch call operations
interface BatchCall {
    to: Address
    data: `0x${string}`
    value?: bigint
}

interface ExecuteResult {
    id: string
    success: boolean
}

/**
 * Hook for EIP-7702 / EIP-5792 batch transaction functionality
 * Uses wallet_sendCalls (EIP-5792) which MetaMask handles with EIP-7702 internally
 * 
 * When a dApp requests batch transactions via wallet_sendCalls:
 * 1. MetaMask prompts user to upgrade EOA to Smart Account (one-time)
 * 2. MetaMask internally uses EIP-7702 to delegate to their Delegator contract
 * 3. All calls are executed atomically in a single transaction
 */
export function useEIP7702() {
    const { address, isConnected, connector } = useAccount()
    const publicClient = usePublicClient()

    // Default to true - let user try EIP-7702, errors will be handled gracefully
    const [isSupported, setIsSupported] = useState<boolean | null>(true)
    const [isExecuting, setIsExecuting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Check if wallet supports wallet_sendCalls (EIP-5792)
     * Note: MetaMask might not fully support wallet_getCapabilities yet,
     * so we default to showing the option and handle errors gracefully
     */
    const checkSupport = useCallback(async (): Promise<boolean> => {
        if (!connector) {
            // Even without connector, keep showing the option
            return true
        }

        try {
            const provider = await connector.getProvider()
            if (!provider) {
                return true // Optimistic - show option anyway
            }

            // Try to check capabilities, but don't hide the feature if check fails
            try {
                const capabilities = await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
                    method: 'wallet_getCapabilities',
                    params: [address]
                })

                // Check if atomicBatch capability is explicitly supported
                const hasAtomicBatch: boolean = !!(capabilities &&
                    typeof capabilities === 'object' &&
                    Object.values(capabilities as Record<string, { atomicBatch?: { supported: boolean } }>).some(
                        chain => chain?.atomicBatch?.supported === true
                    ))

                if (hasAtomicBatch) {
                    setIsSupported(true)
                    return true
                }
                // If not explicitly supported, still show the option (MetaMask might upgrade)
                setIsSupported(true)
                return true
            } catch {
                // wallet_getCapabilities not supported - still show the option
                // The actual wallet_sendCalls call will reveal if it's supported
                setIsSupported(true)
                return true
            }
        } catch {
            setIsSupported(true)
            return true
        }
    }, [connector, address])

    /**
     * Send batch calls using wallet_sendCalls (EIP-5792)
     * MetaMask will handle the EIP-7702 upgrade internally
     */
    const sendBatchCalls = useCallback(async (calls: BatchCall[]): Promise<ExecuteResult> => {
        if (!connector || !address) {
            throw new Error('Wallet not connected')
        }

        if (calls.length === 0) {
            throw new Error('No calls provided')
        }

        setIsExecuting(true)
        setError(null)

        try {
            const provider = await connector.getProvider()
            if (!provider) {
                throw new Error('Provider not available')
            }

            // Format calls for wallet_sendCalls (EIP-5792)
            const formattedCalls = calls.map(call => ({
                to: call.to,
                data: call.data,
                value: call.value ? `0x${call.value.toString(16)}` : '0x0'
            }))

            // Request batch transaction via wallet_sendCalls (EIP-5792)
            // atomicRequired is a top-level parameter per spec
            const result = await (provider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }).request({
                method: 'wallet_sendCalls',
                params: [{
                    version: '2.0.0',  // MetaMask requires 2.0.0
                    chainId: `0x${(publicClient?.chain?.id ?? 11155111).toString(16)}`, // Default to Sepolia
                    from: address,
                    atomicRequired: true,  // Top-level parameter per EIP-5792
                    calls: formattedCalls
                }]
            })

            // wallet_sendCalls returns an id, not a transaction hash directly
            const callId = result as string

            return {
                id: callId,
                success: true
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Batch transaction failed'
            setError(message)
            throw err
        } finally {
            setIsExecuting(false)
        }
    }, [connector, address, publicClient])

    /**
     * Get status of a batch call using wallet_getCallsStatus
     */
    const getCallsStatus = useCallback(async (callId: string): Promise<{
        status: 'PENDING' | 'CONFIRMED' | 'FAILED'
        receipts?: Array<{ transactionHash: Hash }>
    }> => {
        if (!connector) {
            throw new Error('Wallet not connected')
        }

        const provider = await connector.getProvider()
        if (!provider) {
            throw new Error('Provider not available')
        }

        const result = await (provider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }).request({
            method: 'wallet_getCallsStatus',
            params: [callId]
        })

        return result as {
            status: 'PENDING' | 'CONFIRMED' | 'FAILED'
            receipts?: Array<{ transactionHash: Hash }>
        }
    }, [connector])

    /**
     * Execute approve + deposit in a single batch transaction
     * MetaMask handles the EIP-7702 upgrade automatically
     */
    const executeApproveAndDeposit = useCallback(async (amount: string): Promise<ExecuteResult> => {
        if (!address) {
            throw new Error('Wallet not connected')
        }

        if (!amount || parseFloat(amount) <= 0) {
            throw new Error('Invalid amount')
        }

        const amountWei = parseEther(amount)

        const calls: BatchCall[] = [
            // Call 1: Approve TokenBank to spend tokens
            {
                to: ERC20_TOKEN_ADDRESS as Address,
                data: encodeFunctionData({
                    abi: ERC20_TOKEN_ABI,
                    functionName: 'approve',
                    args: [TOKEN_BANK_ADDRESS as Address, amountWei]
                })
            },
            // Call 2: Deposit tokens to TokenBank
            {
                to: TOKEN_BANK_ADDRESS as Address,
                data: encodeFunctionData({
                    abi: TOKEN_BANK_ABI,
                    functionName: 'deposit',
                    args: [amountWei]
                })
            }
        ]

        return sendBatchCalls(calls)
    }, [address, sendBatchCalls])

    /**
     * Wait for batch call to be confirmed
     */
    const waitForCallsConfirmation = useCallback(async (
        callId: string,
        maxAttempts = 60,
        intervalMs = 2000
    ): Promise<{ success: boolean; transactionHash?: Hash }> => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const status = await getCallsStatus(callId)

                if (status.status === 'CONFIRMED') {
                    return {
                        success: true,
                        transactionHash: status.receipts?.[0]?.transactionHash
                    }
                }

                if (status.status === 'FAILED') {
                    return { success: false }
                }

                // Still pending, wait and retry
                await new Promise(resolve => setTimeout(resolve, intervalMs))
            } catch {
                // Status check failed, wait and retry
                await new Promise(resolve => setTimeout(resolve, intervalMs))
            }
        }

        return { success: false }
    }, [getCallsStatus])

    return {
        // State
        isSupported,
        isConnected,
        isExecuting,
        error,

        // Actions
        checkSupport,
        sendBatchCalls,
        getCallsStatus,
        executeApproveAndDeposit,
        waitForCallsConfirmation
    }
}

export type { BatchCall, ExecuteResult }
