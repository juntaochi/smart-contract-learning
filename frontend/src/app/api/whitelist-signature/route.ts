import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

// 从环境变量读取配置
const PROJECT_OWNER_PRIVATE_KEY = process.env.PROJECT_OWNER_PRIVATE_KEY as `0x${string}`
const NFT_MARKET_ADDRESS = (process.env.NEXT_PUBLIC_NFT_MARKET || '0x4da1B8900A066A8b6f2198b028FAE5635b6aE5ea') as Address
const JAC_NFT_ADDRESS = (process.env.NEXT_PUBLIC_JAC_NFT || '0xE845959F4A838f3114b52317f7BC6dA48B0De8e5') as Address

export async function POST(request: NextRequest) {
    try {
        const { buyer, tokenId, nonce, deadline } = await request.json()

        // 验证参数
        if (!buyer || tokenId === undefined || nonce === undefined || !deadline) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        if (!PROJECT_OWNER_PRIVATE_KEY) {
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
        }

        // 创建项目方钱包
        const account = privateKeyToAccount(PROJECT_OWNER_PRIVATE_KEY)

        const walletClient = createWalletClient({
            account,
            chain: sepolia,
            transport: http(),
        })

        // EIP-712 域和类型
        const domain = {
            name: 'NFTMarket',
            version: '1',
            chainId: sepolia.id,
            verifyingContract: NFT_MARKET_ADDRESS,
        }

        const types = {
            WhitelistPermit: [
                { name: 'buyer', type: 'address' },
                { name: 'nftContract', type: 'address' },
                { name: 'tokenId', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        }

        const message = {
            buyer: buyer as Address,
            nftContract: JAC_NFT_ADDRESS,
            tokenId: BigInt(tokenId),
            nonce: BigInt(nonce),
            deadline: BigInt(deadline),
        }

        // 项目方签名
        const signature = await walletClient.signTypedData({
            account,
            domain,
            types,
            primaryType: 'WhitelistPermit',
            message,
        })

        // 分离 v, r, s
        const r = signature.slice(0, 66)
        const s = '0x' + signature.slice(66, 130)
        const v = parseInt(signature.slice(130, 132), 16)

        console.log('Generated whitelist signature for:', buyer)
        console.log('TokenId:', tokenId, 'Deadline:', deadline)

        return NextResponse.json({
            success: true,
            signature,
            v,
            r,
            s,
            deadline,
            signer: account.address,
        })
    } catch (error: any) {
        console.error('Whitelist signature error:', error)
        return NextResponse.json({ error: error.message || 'Signature failed' }, { status: 500 })
    }
}
