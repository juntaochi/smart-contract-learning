'use client'

import { useAppKit } from '@reown/appkit/react'
import { useAccount, useBalance } from 'wagmi'
import { useEffect, useState } from 'react'

export default function ConnectButton() {
    const { open } = useAppKit()
    const { address, isConnected } = useAccount()
    const { data: balance } = useBalance({ address })
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="flex gap-4 items-center">
            {isConnected ? (
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    <span className="text-xs text-gray-500">
                        {balance?.formatted.slice(0, 6)} {balance?.symbol}
                    </span>
                </div>
            ) : null}
            <button
                onClick={() => open()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
                {isConnected ? 'Wallet' : 'Connect Wallet'}
            </button>
        </div>
    )
}
