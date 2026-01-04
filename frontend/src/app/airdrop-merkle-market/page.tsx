'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, usePublicClient, useReadContract, useWalletClient } from 'wagmi'
import { Address, encodeFunctionData, formatEther, isAddress, parseEther, zeroAddress } from 'viem'

const MARKET_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_MERKLE_MARKET ||
  '0x0000000000000000000000000000000000000000') as Address
const PAYMENT_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_PAYMENT_TOKEN ||
  '0x0000000000000000000000000000000000000000') as Address
const DEFAULT_NFT_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_NFT ||
  '0x0000000000000000000000000000000000000000') as Address

const MARKET_ABI = [
  { type: 'function', name: 'paymentToken', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'merkleRoot', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bytes32' }] },
  {
    type: 'function',
    name: 'getListing',
    stateMutability: 'view',
    inputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'seller', type: 'address' },
          { name: 'nftContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getDiscountedPrice',
    stateMutability: 'view',
    inputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'list',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'delist',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimNFT',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nftContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'merkleProof', type: 'bytes32[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'permitPrePay',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'multicall',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

const ERC721_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
] as const

const parseBigIntInput = (value: string) => {
  if (!value.trim()) return undefined
  try {
    return BigInt(value)
  } catch {
    return undefined
  }
}

const parseMerkleProof = (value: string) => {
  if (!value.trim()) return []
  const cleaned = value.trim()
  let parts: string[] = []

  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) {
        parts = parsed.map((item) => String(item))
      }
    } catch {
      return null
    }
  } else {
    parts = cleaned.split(/[\s,]+/g)
  }

  const proof = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase())

  const invalid = proof.find((item) => !/^0x[0-9a-f]{64}$/.test(item))
  if (invalid) return null

  return proof as `0x${string}`[]
}

export default function AirdropMerkleMarketPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [nftContractInput, setNftContractInput] = useState(DEFAULT_NFT_ADDRESS)
  const [tokenIdInput, setTokenIdInput] = useState('0')
  const [priceInput, setPriceInput] = useState('100')
  const [proofInput, setProofInput] = useState('')
  const [permitDeadline, setPermitDeadline] = useState('')
  const [permitV, setPermitV] = useState('')
  const [permitR, setPermitR] = useState('')
  const [permitS, setPermitS] = useState('')

  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const tokenId = useMemo(() => parseBigIntInput(tokenIdInput), [tokenIdInput])
  const isNftContractValid = isAddress(nftContractInput)
  const nftContract = (isNftContractValid ? nftContractInput : DEFAULT_NFT_ADDRESS) as Address
  const isMarketConfigured = MARKET_ADDRESS !== zeroAddress

  const { data: paymentTokenOnchain } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'paymentToken',
    query: { enabled: isMarketConfigured },
  })

  const { data: merkleRoot } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'merkleRoot',
    query: { enabled: isMarketConfigured },
  })

  const resolvedPaymentToken = (paymentTokenOnchain || PAYMENT_TOKEN_ADDRESS) as Address

  const { data: listing, refetch: refetchListing } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getListing',
    args: tokenId !== undefined ? [nftContract, tokenId] : undefined,
    query: { enabled: tokenId !== undefined && isMarketConfigured },
  })

  const { data: discountedPrice, refetch: refetchDiscountedPrice } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getDiscountedPrice',
    args: tokenId !== undefined ? [nftContract, tokenId] : undefined,
    query: { enabled: tokenId !== undefined && isMarketConfigured },
  })

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: resolvedPaymentToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: resolvedPaymentToken !== zeroAddress },
  })

  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: resolvedPaymentToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, MARKET_ADDRESS] : undefined,
    query: { enabled: resolvedPaymentToken !== zeroAddress && isMarketConfigured },
  })

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const refreshListing = async () => {
    await refetchListing()
    await refetchDiscountedPrice()
  }

  const runTransaction = async (runner: () => Promise<`0x${string}`>, successMessage: string) => {
    if (!publicClient) return
    setError('')
    setSuccess('')
    try {
      const hash = await runner()
      setStatus('等待链上确认...')
      await publicClient.waitForTransactionReceipt({ hash })
      setStatus('')
      setSuccess(successMessage)
      refetchListing()
      refetchDiscountedPrice()
      refetchBalance()
      refetchAllowance()
    } catch (err: any) {
      setStatus('')
      setError(err?.shortMessage || err?.message || '交易失败')
    }
  }

  const handleApproveNFT = async () => {
    if (!walletClient || tokenId === undefined) {
      setError('请填写 Token ID 并连接钱包')
      return
    }
    if (!isNftContractValid) {
      setError('NFT 合约地址无效')
      return
    }
    setStatus('授权 NFT 给市场合约...')
    await runTransaction(
      () =>
        walletClient.writeContract({
          address: nftContract,
          abi: ERC721_ABI,
          functionName: 'approve',
          args: [MARKET_ADDRESS, tokenId],
        }),
      'NFT 授权成功'
    )
  }

  const handleListNFT = async () => {
    if (!walletClient || tokenId === undefined) {
      setError('请填写 Token ID 并连接钱包')
      return
    }
    if (!isNftContractValid) {
      setError('NFT 合约地址无效')
      return
    }
    if (!priceInput.trim()) {
      setError('请输入上架价格')
      return
    }
    let price: bigint
    try {
      price = parseEther(priceInput)
    } catch {
      setError('价格格式错误')
      return
    }
    setStatus('上架 NFT...')
    await runTransaction(
      () =>
        walletClient.writeContract({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'list',
          args: [nftContract, tokenId, price],
        }),
      'NFT 上架成功'
    )
  }

  const handleDelist = async () => {
    if (!walletClient || tokenId === undefined) {
      setError('请填写 Token ID 并连接钱包')
      return
    }
    if (!isNftContractValid) {
      setError('NFT 合约地址无效')
      return
    }
    setStatus('下架 NFT...')
    await runTransaction(
      () =>
        walletClient.writeContract({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'delist',
          args: [nftContract, tokenId],
        }),
      'NFT 已下架'
    )
  }

  const handleApproveDiscount = async () => {
    if (!walletClient || !address) {
      setError('请连接钱包')
      return
    }
    if (!discountedPrice) {
      setError('请先刷新上架信息')
      return
    }
    setStatus('授权代币折扣金额...')
    await runTransaction(
      () =>
        walletClient.writeContract({
          address: resolvedPaymentToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [MARKET_ADDRESS, discountedPrice],
        }),
      '代币授权成功'
    )
  }

  const handleClaim = async () => {
    if (!walletClient || tokenId === undefined) {
      setError('请填写 Token ID 并连接钱包')
      return
    }
    const proof = parseMerkleProof(proofInput)
    if (!proof) {
      setError('Merkle proof 格式错误')
      return
    }
    if (!isNftContractValid) {
      setError('NFT 合约地址无效')
      return
    }
    setStatus('提交白名单购买...')
    await runTransaction(
      () =>
        walletClient.writeContract({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'claimNFT',
          args: [nftContract, tokenId, proof],
        }),
      '白名单购买成功'
    )
  }

  const handlePermitClaim = async () => {
    if (!walletClient || !address || tokenId === undefined) {
      setError('请填写 Token ID 并连接钱包')
      return
    }
    const proof = parseMerkleProof(proofInput)
    if (!proof) {
      setError('Merkle proof 格式错误')
      return
    }
    if (!discountedPrice) {
      setError('请先刷新上架信息以获取折扣价')
      return
    }
    if (!permitDeadline || !permitV || !permitR || !permitS) {
      setError('请填写 Permit 签名参数')
      return
    }
    if (!isNftContractValid) {
      setError('NFT 合约地址无效')
      return
    }
    let deadline: bigint
    try {
      deadline = BigInt(permitDeadline)
    } catch {
      setError('Deadline 格式错误')
      return
    }
    const vValue = Number(permitV)
    if (!Number.isFinite(vValue)) {
      setError('v 参数格式错误')
      return
    }
    const rValue = permitR.trim()
    const sValue = permitS.trim()
    if (!/^0x[0-9a-fA-F]{64}$/.test(rValue) || !/^0x[0-9a-fA-F]{64}$/.test(sValue)) {
      setError('r/s 参数格式错误')
      return
    }
    const permitData = encodeFunctionData({
      abi: MARKET_ABI,
      functionName: 'permitPrePay',
      args: [address, MARKET_ADDRESS, discountedPrice, deadline, vValue, rValue as `0x${string}`, sValue as `0x${string}`],
    })
    const claimData = encodeFunctionData({
      abi: MARKET_ABI,
      functionName: 'claimNFT',
      args: [nftContract, tokenId, proof],
    })
    setStatus('提交 Permit + Claim 多调用...')
    await runTransaction(
      () =>
        walletClient.writeContract({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'multicall',
          args: [[permitData, claimData]],
        }),
      '多调用完成，NFT 已购买'
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">请连接钱包</h2>
      </div>
    )
  }

  const listingData = listing as any
  const allowanceFormatted = tokenAllowance ? formatEther(tokenAllowance) : '0'
  const discountedFormatted = discountedPrice ? formatEther(discountedPrice) : '0'

  return (
    <div className="airdrop-liquid-page">
      <div className="liquid-orb orb-a" />
      <div className="liquid-orb orb-b" />
      <div className="liquid-orb orb-c" />
      <section className="hero">
        <div>
          <p className="eyebrow">Airdrop Merkle NFT Market</p>
          <h1>折扣与白名单，像呼吸一样顺滑。</h1>
          <p className="hero-sub">
            50% 折扣、Merkle Proof 验证、Permit + Multicall 一键完成。为链上体验做“少一步”的设计。
          </p>
        </div>
        <div className="hero-card liquid-glass">
          <div>
            <p className="metric-label">Wallet Balance</p>
            <p className="metric">{tokenBalance ? formatEther(tokenBalance) : '0'} TOKEN</p>
          </div>
          <div>
            <p className="metric-label">Allowance</p>
            <p className="metric small">{allowanceFormatted} TOKEN</p>
          </div>
        </div>
      </section>

      {!isMarketConfigured && (
        <div className="callout warning">
          ⚠️ 请先在环境变量中配置 `NEXT_PUBLIC_AIRDROP_MERKLE_MARKET`、`NEXT_PUBLIC_AIRDROP_PAYMENT_TOKEN`、`NEXT_PUBLIC_AIRDROP_NFT`。
        </div>
      )}

      <section className="glass-grid">
        <div className="glass-card liquid-glass">
          <h3>Market Snapshot</h3>
          <p className="meta-label">Market 地址</p>
          <p className="mono">{MARKET_ADDRESS}</p>
          <p className="meta-label">Payment Token</p>
          <p className="mono">{resolvedPaymentToken}</p>
          <p className="meta-label">Merkle Root</p>
          <p className="mono">{merkleRoot || '未读取'}</p>
        </div>

        <div className="glass-card liquid-glass">
          <h3>Listing Lookup</h3>
          <label className="meta-label">NFT 合约地址</label>
          <input
            value={nftContractInput}
            onChange={(event) => setNftContractInput(event.target.value)}
            className="input mono neu-press"
          />
          <label className="meta-label">Token ID</label>
          <input
            value={tokenIdInput}
            onChange={(event) => setTokenIdInput(event.target.value)}
            className="input neu-press"
            type="number"
            min="0"
          />
          <button onClick={refreshListing} className="button primary">
            刷新 Listing
          </button>
        </div>

        <div className="glass-card liquid-glass">
          <h3>Listing 状态</h3>
          {listingData ? (
            <div className="list">
              <div>
                <span>卖家</span>
                <span className="mono">{listingData.seller?.slice(0, 10)}...</span>
              </div>
              <div>
                <span>全价</span>
                <span className="accent">{formatEther(listingData.price || 0n)} TOKEN</span>
              </div>
              <div>
                <span>折扣价</span>
                <span>{discountedFormatted} TOKEN</span>
              </div>
              <div>
                <span>状态</span>
                <span className={listingData.isActive ? 'ok' : 'bad'}>
                  {listingData.isActive ? '可购买' : '已下架/售出'}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted">请输入 Token ID 后刷新。</p>
          )}
        </div>
      </section>

      <section className="panel-grid">
        <div className="panel neu-panel">
          <h2>Seller 操作</h2>
          <div className="stack">
            <label className="meta-label">上架价格（全价）</label>
            <input
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              className="input neu-press"
              placeholder="100"
            />
          </div>
          {!isNftContractValid && <p className="muted error">NFT 合约地址无效</p>}
          <div className="button-row">
            <button onClick={handleApproveNFT} className="button">
              授权 NFT
            </button>
            <button onClick={handleListNFT} className="button primary">
              上架
            </button>
            <button onClick={handleDelist} className="button ghost">
              下架
            </button>
          </div>
        </div>

        <div className="panel neu-panel">
          <h2>Whitelist 购买</h2>
          <label className="meta-label">Merkle Proof（JSON 数组或换行/逗号分隔）</label>
          <textarea
            value={proofInput}
            onChange={(event) => setProofInput(event.target.value)}
            className="input mono neu-press"
            rows={5}
            placeholder='["0x...","0x..."]'
          />
          <div className="button-row">
            <button onClick={handleApproveDiscount} className="button">
              授权折扣价
            </button>
            <button onClick={handleClaim} className="button primary">
              Claim NFT
            </button>
          </div>
          <p className="muted">折扣价: {discountedFormatted} TOKEN · 当前授权: {allowanceFormatted} TOKEN</p>
        </div>
      </section>

      <section className="panel wide neu-panel">
        <div>
          <h2>Permit + Multicall</h2>
          <p className="muted">粘贴 Permit 签名后，原子化执行授权 + 购买。</p>
        </div>
        <div className="permit-grid">
          <input
            value={permitDeadline}
            onChange={(event) => setPermitDeadline(event.target.value)}
            className="input neu-press"
            placeholder="deadline (unix)"
          />
          <input
            value={permitV}
            onChange={(event) => setPermitV(event.target.value)}
            className="input neu-press"
            placeholder="v"
          />
          <input
            value={permitR}
            onChange={(event) => setPermitR(event.target.value)}
            className="input mono neu-press"
            placeholder="r (0x...)"
          />
          <input
            value={permitS}
            onChange={(event) => setPermitS(event.target.value)}
            className="input mono neu-press"
            placeholder="s (0x...)"
          />
        </div>
        <button onClick={handlePermitClaim} className="button primary full">
          一键购买 (Permit + Claim)
        </button>
      </section>

      {status && <div className="callout">{status}</div>}
      {error && <div className="callout error">❌ {error}</div>}
      {success && <div className="callout success">✅ {success}</div>}

      <style jsx>{`
        .airdrop-liquid-page {
          --text: #0a0c10;
          --subtle: #6b7280;
          --line: rgba(15, 23, 42, 0.12);
          --glass: rgba(255, 255, 255, 0.6);
          --neo: #eef1f7;
          --accent: #0b6fff;
          --accent-soft: rgba(11, 111, 255, 0.18);
          font-family: 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
          color: var(--text);
          display: flex;
          flex-direction: column;
          gap: 32px;
          position: relative;
          isolation: isolate;
        }

        .liquid-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
          opacity: 0.7;
          z-index: -1;
        }

        .orb-a {
          width: 280px;
          height: 280px;
          background: radial-gradient(circle at 30% 30%, #7dd3fc, rgba(125, 211, 252, 0));
          top: -80px;
          left: -60px;
        }

        .orb-b {
          width: 320px;
          height: 320px;
          background: radial-gradient(circle at 30% 30%, #c4b5fd, rgba(196, 181, 253, 0));
          right: -90px;
          top: 120px;
        }

        .orb-c {
          width: 240px;
          height: 240px;
          background: radial-gradient(circle at 30% 30%, #fde68a, rgba(253, 230, 138, 0));
          bottom: 80px;
          left: 30%;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          gap: 32px;
          padding: 32px;
          border-radius: 36px;
          background: linear-gradient(130deg, rgba(255, 255, 255, 0.9), rgba(240, 244, 255, 0.7));
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .hero h1 {
          font-size: clamp(2.5rem, 3.2vw, 3.4rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin-bottom: 12px;
        }

        .hero-sub {
          color: var(--subtle);
          font-size: 1rem;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.22em;
          font-size: 0.72rem;
          color: var(--subtle);
          margin-bottom: 12px;
        }

        .liquid-glass {
          background: var(--glass);
          backdrop-filter: blur(22px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7),
            0 20px 40px rgba(15, 23, 42, 0.1);
        }

        .hero-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          padding: 24px;
          border-radius: 26px;
        }

        .metric-label {
          font-size: 0.72rem;
          color: var(--subtle);
          text-transform: uppercase;
          letter-spacing: 0.18em;
        }

        .metric {
          font-size: 2rem;
          font-weight: 600;
        }

        .metric.small {
          font-size: 1.4rem;
        }

        .glass-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .glass-card {
          border-radius: 26px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .glass-card h3 {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .meta-label {
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--subtle);
        }

        .mono {
          font-family: 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
          font-size: 0.72rem;
          color: #111827;
          word-break: break-all;
        }

        .list {
          display: grid;
          gap: 10px;
          font-size: 0.95rem;
        }

        .list div {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .accent {
          color: var(--accent);
          font-weight: 600;
        }

        .ok {
          color: #2a7d2e;
          font-weight: 600;
        }

        .bad {
          color: #c81e1e;
          font-weight: 600;
        }

        .muted {
          color: var(--subtle);
          font-size: 0.85rem;
        }

        .muted.error {
          color: #c81e1e;
        }

        .panel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }

        .panel {
          border-radius: 28px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .neu-panel {
          background: var(--neo);
          box-shadow: 18px 18px 36px rgba(163, 177, 198, 0.35),
            -18px -18px 36px rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .panel h2 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .panel.wide {
          gap: 20px;
        }

        .stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input {
          border-radius: 18px;
          border: none;
          padding: 10px 14px;
          font-size: 0.95rem;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: inset 6px 6px 12px rgba(163, 177, 198, 0.25),
            inset -6px -6px 12px rgba(255, 255, 255, 0.8);
          transition: box-shadow 0.2s ease;
        }

        .neu-press {
          box-shadow: inset 6px 6px 12px rgba(163, 177, 198, 0.25),
            inset -6px -6px 12px rgba(255, 255, 255, 0.8);
        }

        .input:focus {
          outline: none;
          box-shadow: 0 0 0 3px var(--accent-soft),
            inset 4px 4px 10px rgba(163, 177, 198, 0.22),
            inset -4px -4px 10px rgba(255, 255, 255, 0.85);
        }

        .button-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .button {
          border-radius: 999px;
          padding: 10px 16px;
          border: none;
          background: var(--neo);
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 8px 8px 16px rgba(163, 177, 198, 0.35),
            -8px -8px 16px rgba(255, 255, 255, 0.8);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .button:hover {
          transform: translateY(0.5px);
          box-shadow: 6px 6px 12px rgba(163, 177, 198, 0.28),
            -6px -6px 12px rgba(255, 255, 255, 0.75);
          filter: none;
        }

        .button.primary {
          background: linear-gradient(135deg, #0b6fff, #5bb5ff);
          color: white;
          box-shadow: 0 16px 28px rgba(11, 111, 255, 0.35);
        }

        .button.primary:hover {
          box-shadow: 0 14px 26px rgba(11, 111, 255, 0.28),
            0 0 14px rgba(91, 181, 255, 0.35);
          filter: none;
        }

        .button:active {
          transform: translateY(2px);
          box-shadow: inset 8px 8px 16px rgba(163, 177, 198, 0.4),
            inset -8px -8px 16px rgba(255, 255, 255, 0.6);
        }

        .button.primary:active {
          box-shadow: inset 0 6px 14px rgba(9, 60, 140, 0.35);
          filter: none;
        }

        .button.ghost {
          background: transparent;
          box-shadow: none;
        }

        .button.full {
          width: 100%;
        }

        .permit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .callout {
          border-radius: 18px;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.85);
          font-size: 0.9rem;
          box-shadow: 8px 8px 18px rgba(163, 177, 198, 0.3),
            -8px -8px 18px rgba(255, 255, 255, 0.8);
        }

        .callout.warning {
          background: #fff3d6;
          border-color: #ffdda1;
          color: #8a5a00;
        }

        .callout.error {
          background: #ffeaea;
          border-color: #ffbdbd;
          color: #c81e1e;
        }

        .callout.success {
          background: #eafaf0;
          border-color: #bde8c9;
          color: #2a7d2e;
        }

        @media (max-width: 960px) {
          .hero {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
