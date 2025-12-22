export const PAYMENT_TOKEN_ADDRESS = '0x74abaec9ab23e08069751b3b9ca47ce3fea17d38'
export const NFT_ADDRESS = '0x619aec8bb48357d967f06f2d1582592455782b29'
export const MARKET_ADDRESS = '0x1a54562813c35151a5e8cf4105221212ad97bf52'

export const PAYMENT_TOKEN_ABI = [
    { inputs: [{ name: 'amount', type: 'uint256' }], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }], name: 'allowance', outputs: [{ name: 'remaining', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' }
] as const

export const NFT_ABI = [
    { inputs: [{ name: 'to', type: 'address' }, { name: 'uri', type: 'string' }], name: 'safeMint', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'approve', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'getApproved', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], name: 'isApprovedForAll', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], name: 'setApprovalForAll', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'ownerOf', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' }
] as const

export const MARKET_ABI = [
    { inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }], name: 'list', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'buyNFT', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }], name: 'getListing', outputs: [{ components: [{ name: 'seller', type: 'address' }, { name: 'nftContract', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'price', type: 'uint256' }, { name: 'isActive', type: 'bool' }], name: '', type: 'tuple' }], stateMutability: 'view', type: 'function' }
] as const
