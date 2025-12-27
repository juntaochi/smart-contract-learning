#!/usr/bin/env node
/**
 * CLI 钱包主入口
 * 
 * 使用方法:
 *   npm run dev generate          - 生成新钱包
 *   npm run dev balance <address> - 查询 ETH 余额
 *   npm run dev token-balance <address> - 查询 Token 余额
 *   npm run dev transfer <to> <amount>  - 转账 Token
 *   npm run dev eip7702-upgrade   - 升级 EOA 为 Smart Account
 *   npm run dev eip7702-deposit <amount> - EIP-7702 批量存款
 */
import { Command } from 'commander'
import { config } from 'dotenv'
import {
    generateNewWallet,
    getEthBalance,
    getTokenBalance,
    getAccountFromPrivateKey
} from './wallet.js'
import { transferERC20 } from './transaction.js'
import { eip7702BatchDeposit, upgradeToSmartAccount } from './eip7702.js'
import type { Address, Hex } from 'viem'

// 加载 .env 配置
config()

const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as Address

// 创建 CLI 程序
const program = new Command()

program
    .name('wallet')
    .description('一个用于学习的 CLI 钱包，基于 Viem 构建')
    .version('1.0.0')

/**
 * 命令 1: 生成新钱包
 * 
 * 学习要点:
 * - 展示私钥如何转换为地址
 * - 强调私钥安全的重要性
 */
program
    .command('generate')
    .description('生成一个新的钱包（私钥 + 地址）')
    .option('-s, --save', '保存到 .env 文件')
    .action(async (options: { save?: boolean }) => {
        console.log('\n🔑 生成新钱包...\n')

        const wallet = generateNewWallet()

        console.log('═'.repeat(60))
        console.log('✅ 新钱包生成成功!')
        console.log('═'.repeat(60))
        console.log(`\n📍 地址: ${wallet.address}`)
        console.log(`🔐 私钥: ${wallet.privateKey}`)
        console.log('\n⚠️  警告: 请安全保存私钥，永远不要分享给任何人!')
        console.log('   私钥 = 完全控制权。丢失私钥 = 丢失所有资产。')

        if (options.save) {
            const fs = await import('fs')
            const envContent = `PRIVATE_KEY=${wallet.privateKey}\nRPC_URL=${RPC_URL}\nTOKEN_ADDRESS=${TOKEN_ADDRESS}\n`
            fs.writeFileSync('.env', envContent)
            console.log('\n💾 已保存到 .env 文件')
        } else {
            console.log('\n💡 提示: 使用 --save 选项可自动保存到 .env')
        }
        console.log('═'.repeat(60))
    })

/**
 * 命令: 导入已有私钥
 * 
 * 学习要点:
 * - 验证私钥格式
 * - 从私钥导出地址
 */
program
    .command('import')
    .description('导入已有的私钥')
    .argument('<privateKey>', '私钥（以 0x 开头）')
    .option('-s, --save', '保存到 .env 文件')
    .action(async (privateKey: string, options: { save?: boolean }) => {
        console.log('\n📥 导入钱包...\n')

        try {
            // 验证私钥格式
            if (!privateKey.startsWith('0x')) {
                privateKey = '0x' + privateKey
            }

            const account = getAccountFromPrivateKey(privateKey as Hex)

            console.log('═'.repeat(60))
            console.log('✅ 钱包导入成功!')
            console.log('═'.repeat(60))
            console.log(`\n📍 地址: ${account.address}`)
            console.log(`🔐 私钥: ${privateKey}`)

            if (options.save) {
                const fs = await import('fs')
                const envContent = `PRIVATE_KEY=${privateKey}\nRPC_URL=${RPC_URL}\nTOKEN_ADDRESS=${TOKEN_ADDRESS}\n`
                fs.writeFileSync('.env', envContent)
                console.log('\n💾 已保存到 .env 文件，后续命令将使用此账户')
            } else {
                console.log('\n💡 提示: 使用 --save 选项可保存到 .env 供后续使用')
            }
            console.log('═'.repeat(60))
        } catch (error: any) {
            console.error('❌ 导入失败: 无效的私钥格式')
        }
    })

/**
 * 命令 2: 查询 ETH 余额
 */
program
    .command('balance')
    .description('查询指定地址的 ETH 余额')
    .argument('<address>', '要查询的地址')
    .action(async (address: string) => {
        console.log(`\n💰 查询 ETH 余额: ${address}\n`)

        try {
            const balance = await getEthBalance(RPC_URL, address as Address)

            console.log('═'.repeat(60))
            console.log(`📍 地址: ${address}`)
            console.log(`💎 余额: ${balance.ether} ETH`)
            console.log(`   (${balance.wei.toString()} wei)`)
            console.log('═'.repeat(60))
        } catch (error: any) {
            console.error('❌ 查询失败:', error.message)
        }
    })

/**
 * 命令 3: 查询 Token 余额
 */
program
    .command('token-balance')
    .description('查询指定地址的 ERC20 Token 余额')
    .argument('<address>', '要查询的地址')
    .option('-t, --token <address>', 'Token 合约地址', TOKEN_ADDRESS)
    .action(async (address: string, options: { token: string }) => {
        console.log(`\n🪙 查询 Token 余额: ${address}\n`)

        try {
            const tokenAddr = options.token as Address
            const balance = await getTokenBalance(RPC_URL, tokenAddr, address as Address)

            console.log('═'.repeat(60))
            console.log(`📍 地址: ${address}`)
            console.log(`🪙 Token: ${tokenAddr}`)
            console.log(`💰 余额: ${balance.formatted} ${balance.symbol}`)
            console.log(`   (原始值: ${balance.balance.toString()})`)
            console.log(`   (小数位: ${balance.decimals})`)
            console.log('═'.repeat(60))
        } catch (error: any) {
            console.error('❌ 查询失败:', error.message)
        }
    })

/**
 * 命令 4: 转账 Token
 * 
 * 这是最重要的命令，展示完整的交易流程:
 * 1. 构建 EIP-1559 交易
 * 2. 签名交易
 * 3. 发送交易
 * 4. 等待确认
 */
program
    .command('transfer')
    .description('使用 EIP-1559 交易转账 ERC20 Token')
    .argument('<to>', '接收地址')
    .argument('<amount>', '转账数量（Token 单位，如 100）')
    .option('-t, --token <address>', 'Token 合约地址', TOKEN_ADDRESS)
    .option('-d, --decimals <number>', 'Token 小数位', '18')
    .action(async (to: string, amountStr: string, options: { token: string, decimals: string }) => {
        // 检查私钥
        if (!PRIVATE_KEY) {
            console.error('❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY')
            process.exit(1)
        }

        const account = getAccountFromPrivateKey(PRIVATE_KEY)
        const decimals = parseInt(options.decimals)
        // 将人类可读的数量转换为 wei
        const amount = BigInt(Math.floor(parseFloat(amountStr) * Math.pow(10, decimals)))

        console.log('\n📤 ERC20 Token 转账')
        console.log('═'.repeat(60))
        console.log(`   发送者: ${account.address}`)
        console.log(`   接收者: ${to}`)
        console.log(`   数量: ${amountStr} Token`)
        console.log(`   Token 合约: ${options.token}`)
        console.log('═'.repeat(60))

        try {
            const result = await transferERC20(
                RPC_URL,
                PRIVATE_KEY,
                options.token as Address,
                to as Address,
                amount
            )

            console.log(`\n🎉 转账成功!`)
            console.log(`   交易哈希: ${result.hash}`)
        } catch (error: any) {
            console.error('❌ 转账失败:', error.message)
        }
    })

/**
 * 命令 5: 显示当前配置的账户信息
 */
program
    .command('info')
    .description('显示当前配置的账户信息')
    .action(async () => {
        if (!PRIVATE_KEY) {
            console.error('❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY')
            process.exit(1)
        }

        const account = getAccountFromPrivateKey(PRIVATE_KEY)

        console.log('\n📋 当前钱包配置')
        console.log('═'.repeat(60))
        console.log(`   地址: ${account.address}`)
        console.log(`   RPC: ${RPC_URL}`)
        console.log(`   Token: ${TOKEN_ADDRESS}`)
        console.log('═'.repeat(60))

        // 查询余额
        console.log('\n💰 余额查询中...')

        try {
            const [ethBalance, tokenBalance] = await Promise.all([
                getEthBalance(RPC_URL, account.address),
                getTokenBalance(RPC_URL, TOKEN_ADDRESS, account.address)
            ])

            console.log(`   ETH: ${ethBalance.ether} ETH`)
            console.log(`   ${tokenBalance.symbol}: ${tokenBalance.formatted}`)
        } catch (error: any) {
            console.error('   查询余额失败:', error.message)
        }

        console.log('═'.repeat(60))
    })

/**
 * 命令 6: 升级 EOA 为 Smart Account (EIP-7702)
 *
 * 学习要点:
 * - EIP-7702 授权签名
 * - EOA 临时获得智能合约功能
 * - MetaMask Delegator 合约
 */
program
    .command('eip7702-upgrade')
    .description('升级 EOA 为 MetaMask Smart Account (EIP-7702)')
    .action(async () => {
        // 检查私钥
        if (!PRIVATE_KEY) {
            console.error('❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY')
            process.exit(1)
        }

        try {
            const result = await upgradeToSmartAccount(RPC_URL, PRIVATE_KEY)

            if (result.success) {
                console.log('\n✅ 操作完成!')
            } else {
                console.error('\n❌ 操作失败')
                process.exit(1)
            }
        } catch (error: any) {
            console.error('❌ 升级失败:', error.message)
            process.exit(1)
        }
    })

/**
 * 命令 7: EIP-7702 批量存款 (approve + deposit)
 *
 * 学习要点:
 * - 批量交易打包
 * - 单笔交易完成多个操作
 * - 无需单独 approve 交易
 */
program
    .command('eip7702-deposit')
    .description('EIP-7702 批量存款: 在单笔交易中完成 approve + deposit')
    .argument('<amount>', '存款金额（Token 单位，如 1.5）')
    .action(async (amount: string) => {
        // 检查私钥
        if (!PRIVATE_KEY) {
            console.error('❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY')
            process.exit(1)
        }

        // 验证金额
        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            console.error('❌ 错误: 请输入有效的存款金额')
            process.exit(1)
        }

        try {
            const result = await eip7702BatchDeposit(RPC_URL, PRIVATE_KEY, amount)

            if (result.success) {
                console.log('\n✅ 批量存款完成!')
                console.log('   你可以在 Etherscan 上查看交易详情:')
                console.log(`   https://sepolia.etherscan.io/tx/${result.batchHash}`)
            } else {
                console.error('\n❌ 批量存款失败')
                process.exit(1)
            }
        } catch (error: any) {
            console.error('❌ 批量存款失败:', error.message)
            if (error.cause) {
                console.error('   原因:', error.cause)
            }
            process.exit(1)
        }
    })

// 解析命令行参数
program.parse()
