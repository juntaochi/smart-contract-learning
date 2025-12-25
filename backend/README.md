# ERC20 转账记录索引系统

这是一个用于索引和查询 ERC20 代币转账记录的后端服务系统。通过监听区块链上的 Transfer 事件，将转账记录存储到数据库中，并提供 RESTful API 供前端查询。

## 功能特性

✅ **历史数据索引**
- 使用 `getLogs` 批量索引历史转账事件
- 支持断点续传（通过 BlockTracker 记录进度）
- 批量处理，避免 RPC 限流

✅ **实时事件监听**
- 使用 `watchEvent` 实时监听新的转账事件
- 自动存储到数据库

✅ **RESTful API**
- 查询指定地址的转账记录
- 支持分页、排序、过滤
- 提供转账统计数据

✅ **多代币支持**
- 可同时索引多个 ERC20 代币合约
- 支持按代币地址过滤查询

## 技术栈

- **Node.js** + **TypeScript**
- **Express.js** - Web 框架
- **Viem** - 以太坊交互库
- **PostgreSQL** - 数据库
- **Prisma** - ORM

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# PostgreSQL 数据库连接
DATABASE_URL="postgresql://postgres:password@localhost:5432/erc20_indexer?schema=public"

# 区块链 RPC 节点
RPC_URL="http://127.0.0.1:8545"
CHAIN_ID=31337

# 要索引的 ERC20 代币地址（多个用逗号分隔）
TOKEN_ADDRESSES="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# API 配置
PORT=3000
API_HOST="0.0.0.0"

# 索引器配置
START_BLOCK=0          # 从哪个区块开始索引
BATCH_SIZE=10000       # 每批查询多少区块
POLL_INTERVAL=5000     # 轮询间隔（毫秒）
```

### 3. 设置数据库

确保 PostgreSQL 正在运行，然后初始化数据库：

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 4. 启动服务

**方式一：同时启动 API 和索引器**
```bash
npm run dev
```

**方式二：分别启动**
```bash
# 终端 1：启动 API 服务器
npm run api

# 终端 2：启动索引器
npm run indexer
```

## API 文档

### 1. 获取地址的转账记录

**请求：**
```
GET /api/transfers/:address
```

**查询参数：**
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20，最大 100
- `tokenAddress` (可选): 按代币地址过滤
- `fromTimestamp` (可选): 开始时间（ISO 8601 格式）
- `toTimestamp` (可选): 结束时间（ISO 8601 格式）
- `sortBy` (可选): 排序字段，`blockNumber` 或 `blockTimestamp`，默认 `blockNumber`
- `order` (可选): 排序方向，`asc` 或 `desc`，默认 `desc`

**示例：**
```bash
# 获取地址的所有转账记录
curl http://localhost:3000/api/transfers/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# 分页查询
curl "http://localhost:3000/api/transfers/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?page=1&limit=10"

# 按代币地址过滤
curl "http://localhost:3000/api/transfers/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?tokenAddress=0x5FbDB2315678afecb367f032d93F642f64180aa3"

# 按时间范围过滤
curl "http://localhost:3000/api/transfers/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?fromTimestamp=2024-01-01T00:00:00Z&toTimestamp=2024-12-31T23:59:59Z"
```

**响应：**
```json
{
  "success": true,
  "data": {
    "transfers": [
      {
        "id": "clx1234567890",
        "transactionHash": "0x1234...",
        "blockNumber": "12345678",
        "blockTimestamp": "2024-01-15T10:30:00.000Z",
        "tokenAddress": "0x5fbdb...",
        "from": "0x742d35...",
        "to": "0xf39fd6...",
        "value": "1000000000000000000",
        "direction": "outgoing"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 2. 获取转账统计

**请求：**
```
GET /api/transfers/:address/summary
```

**查询参数：**
- `tokenAddress` (可选): 按代币地址过滤

**示例：**
```bash
curl http://localhost:3000/api/transfers/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/summary
```

**响应：**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "totalSent": 50,
    "totalReceived": 100,
    "totalTransfers": 150,
    "uniqueTokens": 3
  }
}
```

### 3. 健康检查

**请求：**
```
GET /health
```

**响应：**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 数据库管理

```bash
# 查看数据库（Prisma Studio 可视化界面）
npm run prisma:studio

# 重置数据库
npx prisma migrate reset

# 创建新迁移
npx prisma migrate dev --name migration_name
```

## 项目结构

```
backend/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   └── validator.ts      # API 请求验证
│   │   ├── routes/
│   │   │   └── transfers.ts      # 转账记录路由
│   │   └── server.ts             # Express 服务器
│   ├── indexer/
│   │   ├── erc20-indexer.ts      # ERC20 事件索引器
│   │   └── index.ts              # 索引器入口
│   ├── utils/
│   │   ├── db.ts                 # 数据库工具
│   │   └── helpers.ts            # 工具函数
│   ├── config/
│   │   └── index.ts              # 配置管理
│   └── index.ts                  # 主入口
├── prisma/
│   └── schema.prisma             # 数据库 Schema
├── package.json
└── tsconfig.json
```

## 开发指南

### 添加新的索引代币

在 `.env` 文件中，将新的代币地址添加到 `TOKEN_ADDRESSES`：

```env
TOKEN_ADDRESSES="0xToken1,0xToken2,0xToken3"
```

重启索引器即可自动开始索引新代币。

### 处理大量历史数据

如果代币有大量历史转账，可以调整配置：

```env
BATCH_SIZE=5000    # 减小批次大小
START_BLOCK=10000  # 从指定区块开始
```

### 监控索引进度

索引器会在控制台输出进度信息：
- 已索引的区块范围
- 找到的事件数量
- 存储的记录数量

## 常见问题

**Q: 如何切换到测试网或主网？**

A: 修改 `.env` 中的 `RPC_URL` 和 `CHAIN_ID`：
```env
# Sepolia 测试网
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
CHAIN_ID=11155111

# 以太坊主网
RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
CHAIN_ID=1
```

**Q: 索引器中断后如何恢复？**

A: 系统使用 `BlockTracker` 自动记录进度，重启后会从上次停止的地方继续索引。

**Q: 如何处理链重组？**

A: 当前版本使用 `skipDuplicates` 避免重复存储。未来版本可以添加更完善的重组检测。

## License

MIT
