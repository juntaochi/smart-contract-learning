# EIP-712 前端部署指南

## 📝 概述

我已经为你创建了两个新的前端页面：

1. **⚡ Permit Deposit** (`/tokenbank-permit`) - 使用 EIP-712 签名的一键存款
2. **🎫 NFT Whitelist** (`/nft-whitelist`) - 项目方白名单签名购买 NFT

## 🚀 部署步骤

### 步骤 1: 部署智能合约

首先，启动本地 Anvil 节点（或使用测试网）：

```bash
# 启动本地节点
anvil
```

然后在新终端中部署合约：

```bash
cd /Users/jac/Repos/smart-contract-learning

# 部署 EIP-712 合约
forge script script/DeployEIP712.s.sol:DeployEIP712 \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

记录输出的合约地址：

- JAC_TOKEN_ADDRESS
- TOKEN_BANK_ADDRESS
- JAC_NFT_ADDRESS
- NFT_MARKET_ADDRESS

### 步骤 2: 更新前端配置

#### 2.1 更新 TokenBank Permit 页面

编辑 `frontend/src/app/tokenbank-permit/page.tsx`：

```typescript
// 第 6-7 行
const JAC_TOKEN_ADDRESS = '0xYourJacTokenAddress' as Address
const TOKEN_BANK_ADDRESS = '0xYourTokenBankAddress' as Address
```

#### 2.2 更新 NFT Whitelist 页面

编辑 `frontend/src/app/nft-whitelist/page.tsx`：

```typescript
// 第 6-9 行
const JAC_TOKEN_ADDRESS = '0xYourJacTokenAddress' as Address
const JAC_NFT_ADDRESS = '0xYourJacNFTAddress' as Address
const NFT_MARKET_ADDRESS = '0xYourNFTMarketAddress' as Address
const PROJECT_OWNER_ADDRESS = '0xYourWalletAddress' as Address
```

### 步骤 3: 启动前端

```bash
cd frontend
npm run dev
```

访问 `http://localhost:3000`

## 🎯 使用指南

### 使用 Permit Deposit（⚡ 一键存款）

1. 访问 "⚡ Permit Deposit" 页面
2. 输入存款金额
3. 点击 "⚡ Sign & Deposit"
4. 在钱包中签名（免费，不发交易）
5. 确认交易
6. ✅ 完成！只用了一笔交易

**优势**：相比传统方式节省一笔 approve 交易

### 使用 NFT Whitelist（🎫 白名单购买）

#### 作为项目方（生成签名）

使用以下脚本为白名单用户生成签名：

```bash
cd /Users/jac/Repos/smart-contract-learning

# 生成白名单签名（将在后续创建此脚本）
forge script script/GenerateWhitelistSignature.s.sol \
  --rpc-url http://127.0.0.1:8545
```

#### 作为买家（使用签名购买）

1. 访问 "🎫 NFT Whitelist" 页面
2. 输入 NFT Token ID
3. 粘贴项目方提供的签名
4. 点击 "🎨 Purchase NFT"
5. 确认交易
6. ✅ NFT 已转移到你的钱包！

## 🔧 测试流程

### 快速测试（本地网络）

1. 确保使用 Anvil 默认账户（已有 10000 ETH）
2. 部署合约会自动：
   - 给你铸造 1000 万 JAC 代币
   - 铸造并上架一个 NFT（Token ID #0）

3. 测试 Permit Deposit：
   - 存入 1000 JAC
   - 应该只需要签名 + 一笔交易

4. 测试 NFT Whitelist：
   - 运行签名生成脚本（待创建）
   - 复制签名到前端
   - 购买 NFT #0

## 📱 页面特性

### Permit Deposit 页面

- ✅ 实时显示钱包和银行余额
- ✅ EIP-712 签名集成
- ✅ 交易状态显示
- ✅ 错误处理和提示
- ✅ 响应式设计

### NFT Whitelist 页面

- ✅ NFT 信息展示
- ✅ 白名单签名验证
- ✅ 自动代币授权
- ✅ 购买流程引导
- ✅ 成功/失败通知

## 🎨 UI 设计

两个页面都采用现代化设计：

- 渐变色卡片
- 动画效果
- 响应式布局
- 清晰的状态提示
- 专业的错误处理

## 🔜 后续改进（可选）

1. **添加签名生成工具**
   - 创建项目方签名生成页面
   - 支持批量白名单

2. **NFT 展示**
   - 显示 NFT 图片
   - NFT 元数据

3. **交易历史**
   - Permit 存款历史
   - NFT 购买历史

4. **Gas 估算**
   - 显示预估 gas 费用
   - 对比传统方式节省的 gas

## 📄 相关文件

- TokenBank Permit: `frontend/src/app/tokenbank-permit/page.tsx`
- NFT Whitelist: `frontend/src/app/nft-whitelist/page.tsx`
- Navigation: `frontend/src/components/Navigation.tsx`
- Deploy Script: `script/DeployEIP712.s.sol`

## ❓ 常见问题

**Q: 为什么需要先部署合约？**
A: 前端需要合约地址才能与链上合约交互。

**Q: 可以使用测试网吗？**
A: 可以！修改部署脚本的 `--rpc-url` 为 Sepolia 或其他测试网。

**Q: 签名会过期吗？**
A: 是的，默认 1 小时后过期（可在前端修改 deadline）。

**Q: 如何获取测试代币？**
A: 本地网络：自动获得 | 测试网：使用水龙头获取测试 ETH

---

前端已准备就绪！部署合约并更新地址即可使用。 🚀
