/**
 * 钱包模块 - 处理私钥生成和账户管理
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, formatEther } from 'viem'
import { chain, erc20Abi } from './config.js'
import type { Address, Hex } from 'viem'

/**
 * 生成新的私钥和账户
 * 
 * 学习要点:
 * - generatePrivateKey() 使用加密安全的随机数生成器
 * - 私钥是 256 位 (32 字节) 的随机数
 * - privateKeyToAccount() 通过椭圆曲线导出公钥和地址
 */
export function generateNewWallet() {
    // 1. 生成随机私钥
    const privateKey = generatePrivateKey()

    // 2. 从私钥导出账户（包含地址）
    const account = privateKeyToAccount(privateKey)

    return {
        privateKey,
        address: account.address,
        account
    }
}

/**
 * 从私钥恢复账户
 */
export function getAccountFromPrivateKey(privateKey: Hex) {
    return privateKeyToAccount(privateKey)
}

/**
 * 创建公共客户端（用于只读操作）
 * 
 * 学习要点:
 * - PublicClient 用于查询链上数据
 * - 不需要私钥，任何人都可以查询
 */
export function createClient(rpcUrl: string) {
    return createPublicClient({
        chain,
        transport: http(rpcUrl)
    })
}

/**
 * 创建钱包客户端（用于签名和发送交易）
 * 
 * 学习要点:
 * - WalletClient 需要私钥来签名交易
 * - 组合了签名能力和发送能力
 */
export function createWallet(rpcUrl: string, privateKey: Hex) {
    const account = privateKeyToAccount(privateKey)

    return createWalletClient({
        chain,
        transport: http(rpcUrl),
        account
    })
}

/**
 * 查询 ETH 余额
 */
export async function getEthBalance(rpcUrl: string, address: Address) {
    const client = createClient(rpcUrl)
    const balance = await client.getBalance({ address })

    return {
        wei: balance,
        ether: formatEther(balance)
    }
}

/**
 * 查询 ERC20 Token 余额
 * 
 * 学习要点:
 * - 调用合约的 balanceOf 函数
 * - 需要知道 Token 的 decimals 来正确显示
 */
export async function getTokenBalance(
    rpcUrl: string,
    tokenAddress: Address,
    accountAddress: Address
) {
    const client = createClient(rpcUrl)

    // 并行查询 symbol, decimals 和 balance
    const [symbol, decimals, balance] = await Promise.all([
        client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'symbol'
        }),
        client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'decimals'
        }),
        client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [accountAddress]
        })
    ])

    // 计算人类可读的余额
    const formattedBalance = Number(balance) / Math.pow(10, decimals)

    return {
        symbol,
        decimals,
        balance,
        formatted: formattedBalance.toLocaleString()
    }
}
