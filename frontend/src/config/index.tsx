import { cookieStorage, createStorage, createConfig } from 'wagmi'
import { mainnet, sepolia, foundry } from 'wagmi/chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

export const projectId = 'b19aa02c7491c20a4ff112250610ba9a' // User provided project ID

if (!projectId) {
    throw new Error('Project ID is not defined')
}

export const networks = [mainnet, sepolia, foundry]

export const wagmiAdapter = new WagmiAdapter({
    ssr: true,
    projectId,
    networks
})

export const config = wagmiAdapter.wagmiConfig

export const metadata = {
    name: 'NFTMarket',
    description: 'AppKit Example',
    url: 'https://reown.com/appkit',
    icons: ['https://assets.reown.com/reown-profile-pic.png']
}

createAppKit({
    adapters: [wagmiAdapter],
    networks: [sepolia, mainnet, foundry],
    metadata: metadata,
    projectId,
    features: {
        analytics: true
    }
})
