# Frontend - ERC20 Transfer History

前端已添加转账历史功能！

## 新增内容

### 页面和组件
- ✅ `/transfers` 页面 - 转账历史主页面
- ✅ `TransferHistory` 组件 - 完整的转账记录展示
- ✅ `useTransfers` hook - 数据获取钩子
- ✅ 导航菜单已更新

### 功能特性
1. **钱包连接检测**
   - 未连接时显示连接提示
   - 使用 AppKit 连接按钮

2. **统计信息卡片**
   - 总转账数
   - 收到的转账数
   - 发送的转账数
   - 涉及的代币种类

3. **转账列表**
   - 完整的表格展示
   - 显示方向（IN/OUT）
   - 地址缩写显示
   - Etherscan 链接
   - 时间格式化
   - 金额格式化

4. **过滤和分页**
   - 按代币地址过滤
   - 分页导航
   - 显示总记录数

5. **实时更新**
   - 每10秒自动刷新数据
   - 加载状态提示

## 使用方法

访问 http://localhost:3001/transfers

1. 连接你的钱包
2. 自动显示该地址的所有转账记录
3. 可以按代币地址过滤
4. 支持分页浏览

## API 配置

如果后端 API 运行在不同端口，修改 `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:YOUR_PORT
```
