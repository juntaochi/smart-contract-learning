/**
 * EIP-7702 批量交易模块
 * 
 * 功能:
 * - 升级 EOA 为 MetaMask Smart Account
 * - 执行批量交易 (如 approve + deposit)
 * 
 * 参考文档:
 * - https://docs.metamask.io/smart-accounts-kit/get-started/quickstart/
 * - https://viem.sh/docs/eip7702/signAuthorization
 */
import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    encodeFunctionData,
    encodeAbiParameters,
    zeroAddress,
    type Address,
    type Hex,
    type Hash
} from 'viem'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import {
    getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'

// ============================================
// 常量配置
// ============================================

// 默认合约地址 (Sepolia - 与前端相同)
const DEFAULT_TOKEN_BANK_ADDRESS = '0xd295804891ced6f832673ef1f0ad955a4a5bb75c' as Address
const DEFAULT_ERC20_TOKEN_ADDRESS = '0x132d8a7b73e62094ff6fa73f3f7d1b8d76467dc2' as Address

// 可通过环境变量覆盖
export const TOKEN_BANK_ADDRESS = (process.env.TOKEN_BANK_ADDRESS || DEFAULT_TOKEN_BANK_ADDRESS) as Address
export const ERC20_TOKEN_ADDRESS = (process.env.ERC20_TOKEN_ADDRESS || process.env.TOKEN_ADDRESS || DEFAULT_ERC20_TOKEN_ADDRESS) as Address

// ABI 定义
const TOKEN_BANK_ABI = [
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: []
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    }
] as const

const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    }
] as const

// ============================================
// 类型定义
// ============================================

interface EIP7702Result {
    upgradeHash?: Hash
    batchHash?: Hash
    success: boolean
}

// ============================================
// 核心函数
// ============================================

/**
 * 步骤 1: 设置客户端
 */
export function setupClients(rpcUrl: string, privateKey: Hex) {
    const account = privateKeyToAccount(privateKey)

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl),
    })

    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(rpcUrl),
    })

    return { publicClient, walletClient, account }
}

/**
 * 步骤 2: 检查 EOA 是否已升级为 Smart Account
 */
export async function checkIsSmartAccount(
    publicClient: ReturnType<typeof createPublicClient>,
    address: Address
): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== '0x' && code.length > 2
}

/**
 * 步骤 3: 签署 EIP-7702 授权
 */
export async function signEIP7702Authorization(
    walletClient: ReturnType<typeof createWalletClient>,
    account: PrivateKeyAccount
) {
    console.log('📝 签署 EIP-7702 授权...')

    // 获取 MetaMask Smart Accounts 环境配置
    const environment = getSmartAccountsEnvironment(sepolia.id)
    const contractAddress = environment.implementations.EIP7702StatelessDeleGatorImpl

    console.log(`   委托合约: ${contractAddress}`)

    // 签署授权 - 使用 executor: 'self' 让 EOA 自己执行
    const authorization = await walletClient.signAuthorization({
        account,
        contractAddress,
        executor: 'self',
    })

    console.log('✅ 授权签署成功')
    console.log(`   chainId: ${authorization.chainId}`)
    console.log(`   nonce: ${authorization.nonce}`)

    return authorization
}

/**
 * 步骤 4: 提交授权 - 升级 EOA 为 Smart Account
 */
export async function submitAuthorization(
    walletClient: ReturnType<typeof createWalletClient>,
    account: PrivateKeyAccount,
    authorization: Awaited<ReturnType<typeof signEIP7702Authorization>>
): Promise<Hash> {
    console.log('📤 发送 EIP-7702 升级交易...')

    // 发送一个空交易来提交授权
    const hash = await walletClient.sendTransaction({
        account,
        chain: sepolia,
        authorizationList: [authorization],
        data: '0x',
        to: zeroAddress,
    })

    console.log(`✅ 升级交易已发送: ${hash}`)

    return hash
}

/**
 * 步骤 5: 执行批量交易 - approve + deposit
 */
export async function executeBatchApproveAndDeposit(
    walletClient: ReturnType<typeof createWalletClient>,
    account: PrivateKeyAccount,
    authorization: Awaited<ReturnType<typeof signEIP7702Authorization>>,
    amount: bigint
): Promise<Hash> {
    console.log('📦 准备批量交易 (approve + deposit)...')
    console.log(`   Token: ${ERC20_TOKEN_ADDRESS}`)
    console.log(`   TokenBank: ${TOKEN_BANK_ADDRESS}`)
    console.log(`   金额: ${amount.toString()} wei`)

    // 编码 approve 调用
    const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TOKEN_BANK_ADDRESS, amount]
    })

    // 编码 deposit 调用
    const depositData = encodeFunctionData({
        abi: TOKEN_BANK_ABI,
        functionName: 'deposit',
        args: [amount]
    })

    // 批量执行模式: 0x0100... = 批量执行，失败回滚
    const BATCH_REVERT_MODE = '0x0100000000000000000000000000000000000000000000000000000000000000' as Hex

    // ERC-7579 格式的 Execution[] 
    const executions = [
        { target: ERC20_TOKEN_ADDRESS, value: 0n, callData: approveData },
        { target: TOKEN_BANK_ADDRESS, value: 0n, callData: depositData }
    ]

    // 编码 executionData
    const executionData = encodeAbiParameters(
        [{
            type: 'tuple[]',
            components: [
                { name: 'target', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'callData', type: 'bytes' }
            ]
        }],
        [executions]
    )

    // 编码 execute 函数调用
    const executeAbi = [{
        name: 'execute',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'mode', type: 'bytes32' },
            { name: 'executionData', type: 'bytes' }
        ],
        outputs: []
    }] as const

    const executeCallData = encodeFunctionData({
        abi: executeAbi,
        functionName: 'execute',
        args: [BATCH_REVERT_MODE, executionData]
    })

    console.log('📤 发送批量交易...')

    // EIP-7702 交易: 发送到自己的地址（因为已委托给 Delegator）
    const hash = await walletClient.sendTransaction({
        account,
        chain: sepolia,
        authorizationList: [authorization],
        to: account.address,
        data: executeCallData,
    })

    console.log(`✅ 批量交易已发送: ${hash}`)

    return hash
}

/**
 * 主函数: 完整的 EIP-7702 批量存款流程
 */
export async function eip7702BatchDeposit(
    rpcUrl: string,
    privateKey: Hex,
    amountEther: string
): Promise<EIP7702Result> {
    console.log('\n' + '═'.repeat(60))
    console.log('⚡ EIP-7702 批量交易: Approve + Deposit')
    console.log('═'.repeat(60))

    const amount = parseEther(amountEther)

    // 1. 设置客户端
    const { publicClient, walletClient, account } = setupClients(rpcUrl, privateKey)
    console.log(`\n📍 账户地址: ${account.address}`)

    // 2. 检查是否已是 Smart Account
    const isSmartAccount = await checkIsSmartAccount(publicClient, account.address)
    console.log(`🔍 Smart Account 状态: ${isSmartAccount ? '已升级' : '未升级'}`)

    // 3. 查询当前余额
    const tokenBalance = await publicClient.readContract({
        address: ERC20_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
    })
    console.log(`💰 Token 余额: ${tokenBalance.toString()} wei`)

    if (tokenBalance < amount) {
        console.error('❌ Token 余额不足!')
        return { success: false }
    }

    // 4. 签署 EIP-7702 授权
    console.log('\n--- 步骤 1: 签署授权 ---')
    const authorization = await signEIP7702Authorization(walletClient, account)

    // 5. 执行批量交易
    console.log('\n--- 步骤 2: 执行批量交易 ---')
    const batchHash = await executeBatchApproveAndDeposit(
        walletClient,
        account,
        authorization,
        amount
    )

    // 6. 等待交易确认
    console.log('\n⏳ 等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: batchHash })

    if (receipt.status === 'success') {
        console.log('\n' + '═'.repeat(60))
        console.log('🎉 EIP-7702 批量交易成功!')
        console.log('═'.repeat(60))
        console.log(`   交易哈希: ${batchHash}`)
        console.log(`   区块号: ${receipt.blockNumber}`)
        console.log(`   Gas 使用: ${receipt.gasUsed.toString()}`)

        // 查询更新后的余额
        const [newTokenBalance, bankBalance] = await Promise.all([
            publicClient.readContract({
                address: ERC20_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [account.address]
            }),
            publicClient.readContract({
                address: TOKEN_BANK_ADDRESS,
                abi: TOKEN_BANK_ABI,
                functionName: 'balanceOf',
                args: [account.address]
            })
        ])

        console.log(`\n📊 更新后余额:`)
        console.log(`   Token 余额: ${newTokenBalance.toString()} wei`)
        console.log(`   Bank 存款: ${bankBalance.toString()} wei`)
        console.log('═'.repeat(60))

        return { batchHash, success: true }
    } else {
        console.error('❌ 交易失败!')
        return { batchHash, success: false }
    }
}

/**
 * 辅助函数: 仅升级 EOA 为 Smart Account
 */
export async function upgradeToSmartAccount(
    rpcUrl: string,
    privateKey: Hex
): Promise<EIP7702Result> {
    console.log('\n' + '═'.repeat(60))
    console.log('⬆️ 升级 EOA 为 MetaMask Smart Account')
    console.log('═'.repeat(60))

    // 1. 设置客户端
    const { publicClient, walletClient, account } = setupClients(rpcUrl, privateKey)
    console.log(`\n📍 账户地址: ${account.address}`)

    // 2. 检查是否已是 Smart Account
    const isSmartAccount = await checkIsSmartAccount(publicClient, account.address)
    if (isSmartAccount) {
        console.log('✅ 账户已经是 Smart Account，无需升级')
        return { success: true }
    }

    // 3. 签署授权
    console.log('\n--- 签署 EIP-7702 授权 ---')
    const authorization = await signEIP7702Authorization(walletClient, account)

    // 4. 提交授权
    console.log('\n--- 提交升级交易 ---')
    const upgradeHash = await submitAuthorization(walletClient, account, authorization)

    // 5. 等待确认
    console.log('\n⏳ 等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: upgradeHash })

    if (receipt.status === 'success') {
        console.log('\n' + '═'.repeat(60))
        console.log('🎉 升级成功! EOA 现在支持 Smart Account 功能')
        console.log('═'.repeat(60))
        console.log(`   交易哈希: ${upgradeHash}`)

        return { upgradeHash, success: true }
    } else {
        console.error('❌ 升级失败!')
        return { upgradeHash, success: false }
    }
}
