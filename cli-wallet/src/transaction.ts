/**
 * 交易模块 - 处理 ERC20 转账和 EIP-1559 交易
 */
import {
    createPublicClient,
    createWalletClient,
    http,
    encodeFunctionData,
    parseGwei,
    formatEther
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { chain, erc20Abi } from './config.js'
import type { Address, Hex, Hash } from 'viem'

/**
 * 构建 ERC20 转账的 EIP-1559 交易
 * 
 * 学习要点:
 * 1. EIP-1559 交易包含:
 *    - maxFeePerGas: 愿意支付的最高 gas 价格
 *    - maxPriorityFeePerGas: 给矿工的最高小费
 * 
 * 2. ERC20 transfer 的 data 编码:
 *    - 函数选择器: keccak256("transfer(address,uint256)")[0:4] = 0xa9059cbb
 *    - 参数: address (32字节) + uint256 (32字节)
 */
export async function buildERC20TransferTx(
    rpcUrl: string,
    privateKey: Hex,
    tokenAddress: Address,
    toAddress: Address,
    amount: bigint
) {
    const account = privateKeyToAccount(privateKey)
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
    })

    // 1. 编码 ERC20 transfer 调用数据
    // 这就是交易的 data 字段
    const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [toAddress, amount]
    })

    console.log('\n📝 调用数据编码:')
    console.log(`   函数: transfer(address,uint256)`)
    console.log(`   选择器: ${data.slice(0, 10)}`) // 0xa9059cbb
    console.log(`   完整 data: ${data.slice(0, 50)}...`)

    // 2. 获取当前 gas 价格信息
    const [gasPrice, maxPriorityFee, nonce] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.estimateMaxPriorityFeePerGas(),
        publicClient.getTransactionCount({ address: account.address })
    ])

    console.log('\n⛽ Gas 信息:')
    console.log(`   当前 Gas Price: ${formatEther(gasPrice * BigInt(1e9))} Gwei`)
    console.log(`   建议 Priority Fee: ${formatEther(maxPriorityFee * BigInt(1e9))} Gwei`)
    console.log(`   账户 Nonce: ${nonce}`)

    // 3. 估算 gas 用量
    const gasEstimate = await publicClient.estimateGas({
        account: account.address,
        to: tokenAddress,
        data
    })

    console.log(`   预估 Gas Limit: ${gasEstimate}`)

    // 4. 构建 EIP-1559 交易对象
    // 设置 maxFeePerGas 比当前高一些，确保交易能被打包
    const maxFeePerGas = gasPrice * 2n
    const maxPriorityFeePerGas = maxPriorityFee

    const transaction = {
        to: tokenAddress,
        data,
        value: 0n, // ERC20 转账不需要发送 ETH
        nonce,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId: chain.id,
        type: 'eip1559' as const
    }

    console.log('\n📦 EIP-1559 交易对象:')
    console.log(`   类型: EIP-1559 (type: 2)`)
    console.log(`   Chain ID: ${transaction.chainId}`)
    console.log(`   To: ${transaction.to}`)
    console.log(`   Value: ${transaction.value} (0, 因为是 Token 转账)`)
    console.log(`   Max Fee Per Gas: ${formatEther(transaction.maxFeePerGas * BigInt(1e9))} Gwei`)
    console.log(`   Max Priority Fee: ${formatEther(transaction.maxPriorityFeePerGas * BigInt(1e9))} Gwei`)

    return transaction
}

/**
 * 签名交易
 * 
 * 学习要点:
 * - 签名使用 ECDSA (椭圆曲线数字签名算法)
 * - 签名包含 r, s, v 三个值
 * - 签名后的交易可以被任何人广播
 */
export async function signTransaction(
    rpcUrl: string,
    privateKey: Hex,
    transaction: any
) {
    const account = privateKeyToAccount(privateKey)
    const walletClient = createWalletClient({
        chain,
        transport: http(rpcUrl),
        account
    })

    console.log('\n✍️  签名交易...')
    console.log(`   签名者: ${account.address}`)

    // 签名交易
    const signedTx = await walletClient.signTransaction(transaction)

    console.log(`   签名完成!`)
    console.log(`   签名交易 (前100字符): ${signedTx.slice(0, 100)}...`)

    return signedTx
}

/**
 * 发送已签名的交易到网络
 */
export async function sendSignedTransaction(
    rpcUrl: string,
    signedTransaction: Hex
): Promise<Hash> {
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
    })

    console.log('\n📡 发送交易到 Sepolia 网络...')

    const hash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTransaction
    })

    console.log(`   交易哈希: ${hash}`)
    console.log(`   查看交易: https://sepolia.etherscan.io/tx/${hash}`)

    return hash
}

/**
 * 等待交易确认
 */
export async function waitForTransaction(
    rpcUrl: string,
    hash: Hash
) {
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
    })

    console.log('\n⏳ 等待交易确认...')

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    console.log(`   状态: ${receipt.status === 'success' ? '✅ 成功' : '❌ 失败'}`)
    console.log(`   区块号: ${receipt.blockNumber}`)
    console.log(`   Gas 使用: ${receipt.gasUsed}`)

    return receipt
}

/**
 * 一键完成: 构建 + 签名 + 发送 ERC20 转账
 */
export async function transferERC20(
    rpcUrl: string,
    privateKey: Hex,
    tokenAddress: Address,
    toAddress: Address,
    amount: bigint
) {
    console.log('═'.repeat(60))
    console.log('🚀 开始 ERC20 转账流程')
    console.log('═'.repeat(60))
    console.log(`   Token: ${tokenAddress}`)
    console.log(`   To: ${toAddress}`)
    console.log(`   Amount: ${amount.toString()}`)

    // Step 1: 构建交易
    const tx = await buildERC20TransferTx(rpcUrl, privateKey, tokenAddress, toAddress, amount)

    // Step 2: 签名交易
    const signedTx = await signTransaction(rpcUrl, privateKey, tx)

    // Step 3: 发送交易
    const hash = await sendSignedTransaction(rpcUrl, signedTx)

    // Step 4: 等待确认
    const receipt = await waitForTransaction(rpcUrl, hash)

    console.log('\n' + '═'.repeat(60))
    console.log('✅ 转账完成!')
    console.log('═'.repeat(60))

    return { hash, receipt }
}
