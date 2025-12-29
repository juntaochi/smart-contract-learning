
// ============================================
// EIP-7702 MetaMask Delegator Configuration
// ============================================

// MetaMask Official EIP-7702 Delegator Contract (EIP7702StatelessDeleGator)
export const EIP7702_DELEGATOR_ADDRESS = '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B'

// IERC7821 Batch Execution Interface ABI
export const EIP7702_DELEGATOR_ABI = [
    {
        "type": "function",
        "name": "execute",
        "inputs": [
            { "name": "mode", "type": "bytes32", "internalType": "ModeCode" },
            { "name": "executionData", "type": "bytes", "internalType": "bytes" }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "supportsExecutionMode",
        "inputs": [
            { "name": "mode", "type": "bytes32", "internalType": "ModeCode" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
    }
] as const

// ERC-7579 Execution Mode Constants
// See: https://eips.ethereum.org/EIPS/eip-7579
export const EXECUTION_MODE = {
    // Single execution, revert on failure
    SINGLE_REVERT: '0x0000000000000000000000000000000000000000000000000000000000000000' as const,
    // Single execution, skip on failure  
    SINGLE_SKIP: '0x0001000000000000000000000000000000000000000000000000000000000000' as const,
    // Batch execution, revert on failure
    BATCH_REVERT: '0x0100000000000000000000000000000000000000000000000000000000000000' as const,
    // Batch execution, skip on failure
    BATCH_SKIP: '0x0101000000000000000000000000000000000000000000000000000000000000' as const,
} as const

// ============================================
// TokenBank Configuration
// ============================================

// 统一的代币配置
export const TOKENS = {
    JAC: {
        address: '0x43FcFF4c6093C50E09376609b06E156CB5984E00' as const,
        name: 'JAC Token',
        symbol: 'JAC',
        supportsPermit: true,  // EIP-2612 Permit
        supportsCallback: false,
    },
    ERC20: {
        address: '0x132d8a7b73e62094ff6fa73f3f7d1b8d76467dc2' as const,
        name: 'ERC20 Token',
        symbol: 'Token',
        supportsPermit: false,
        supportsCallback: true, // transferWithCallback
    },
} as const

// 银行配置 (TokenBankUnified)
export const BANKS = {
    JAC: '0x146274B506Ca9fDaB0E3c007C973E83d8f299059' as const,
    ERC20: '0x90A5CD5ab8DEDdA7549878C312B7DfDD5529eAd4' as const,
} as const

// Legacy exports for backward compatibility
export const TOKEN_BANK_ADDRESS = BANKS.ERC20
export const ERC20_TOKEN_ADDRESS = TOKENS.ERC20.address

export const TOKEN_BANK_ABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "_token",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "deposit",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "deposits",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "token",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IERC20"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "tokensReceived",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "withdraw",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "Deposit",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Withdraw",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    }
] as const

// JAC Token ABI (ERC20 with EIP-2612 Permit)
export const JAC_TOKEN_ABI = [
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{ "name": "account", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "allowance",
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "value", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transfer",
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "value", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferFrom",
        "inputs": [
            { "name": "from", "type": "address" },
            { "name": "to", "type": "address" },
            { "name": "value", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint8" }],
        "stateMutability": "view"
    },
    // EIP-2612 Permit functions
    {
        "type": "function",
        "name": "permit",
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" },
            { "name": "value", "type": "uint256" },
            { "name": "deadline", "type": "uint256" },
            { "name": "v", "type": "uint8" },
            { "name": "r", "type": "bytes32" },
            { "name": "s", "type": "bytes32" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "nonces",
        "inputs": [{ "name": "owner", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "DOMAIN_SEPARATOR",
        "inputs": [],
        "outputs": [{ "name": "", "type": "bytes32" }],
        "stateMutability": "view"
    }
] as const

// TokenBankV2 ABI (extends TokenBank with permitDeposit)
export const TOKEN_BANK_V2_ABI = [
    ...TOKEN_BANK_ABI,
    {
        "type": "function",
        "name": "permitDeposit",
        "inputs": [
            { "name": "amount", "type": "uint256" },
            { "name": "deadline", "type": "uint256" },
            { "name": "v", "type": "uint8" },
            { "name": "r", "type": "bytes32" },
            { "name": "s", "type": "bytes32" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    }
] as const

// TokenBankUnified ABI - 全能银行，支持所有存款方式
export const TOKEN_BANK_UNIFIED_ABI = [
    {
        "type": "constructor",
        "inputs": [
            { "name": "_token", "type": "address" },
            { "name": "_permit2", "type": "address" }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "token",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "permit2",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{ "name": "account", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "deposits",
        "inputs": [{ "name": "", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "supportsPermit2",
        "inputs": [],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "view"
    },
    // 方式1: 传统存款
    {
        "type": "function",
        "name": "deposit",
        "inputs": [{ "name": "amount", "type": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    // 方式2: Callback (tokensReceived)
    {
        "type": "function",
        "name": "tokensReceived",
        "inputs": [
            { "name": "from", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable"
    },
    // 方式3: EIP-2612 Permit
    {
        "type": "function",
        "name": "permitDeposit",
        "inputs": [
            { "name": "amount", "type": "uint256" },
            { "name": "deadline", "type": "uint256" },
            { "name": "v", "type": "uint8" },
            { "name": "r", "type": "bytes32" },
            { "name": "s", "type": "bytes32" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    // 方式4: Permit2
    {
        "type": "function",
        "name": "depositWithPermit2",
        "inputs": [
            {
                "name": "permitTransfer",
                "type": "tuple",
                "components": [
                    {
                        "name": "permitted",
                        "type": "tuple",
                        "components": [
                            { "name": "token", "type": "address" },
                            { "name": "amount", "type": "uint256" }
                        ]
                    },
                    { "name": "nonce", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" }
                ]
            },
            { "name": "owner", "type": "address" },
            { "name": "signature", "type": "bytes" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    // 提款
    {
        "type": "function",
        "name": "withdraw",
        "inputs": [{ "name": "amount", "type": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    // Events
    {
        "type": "event",
        "name": "Deposit",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "CallbackDeposit",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PermitDeposit",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Permit2Deposit",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Withdraw",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    // Errors
    { "type": "error", "name": "ZeroAmount", "inputs": [] },
    { "type": "error", "name": "ZeroAddress", "inputs": [] },
    { "type": "error", "name": "InsufficientBalance", "inputs": [] },
    { "type": "error", "name": "InvalidToken", "inputs": [] },
    { "type": "error", "name": "InvalidCaller", "inputs": [] }
] as const

export const ERC20_TOKEN_ABI = [
    {
        "type": "function",
        "name": "allowance",
        "inputs": [
            {
                "name": "_owner",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_spender",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "remaining",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            {
                "name": "_spender",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_value",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "success",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
            {
                "name": "_owner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "balance",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "mint",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "transfer",
        "inputs": [
            {
                "name": "_to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_value",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "success",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferFrom",
        "inputs": [
            {
                "name": "_from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_value",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "success",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferWithCallback",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "success",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "Approval",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "spender",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "value",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Transfer",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "value",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    }
] as const

// ============================================
// Permit2 Configuration
// ============================================

// Permit2 官方合约地址（所有网络相同）
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// TokenBankPermit2 合约地址 (需要部署后更新)
export const TOKEN_BANK_PERMIT2_ADDRESS = '0x0000000000000000000000000000000000000000'

// Permit2 ABI
export const PERMIT2_ABI = [
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            { "name": "token", "type": "address" },
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint160" },
            { "name": "expiration", "type": "uint48" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "allowance",
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "token", "type": "address" },
            { "name": "spender", "type": "address" }
        ],
        "outputs": [
            { "name": "amount", "type": "uint160" },
            { "name": "expiration", "type": "uint48" },
            { "name": "nonce", "type": "uint48" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "permitTransferFrom",
        "inputs": [
            {
                "name": "permit",
                "type": "tuple",
                "components": [
                    {
                        "name": "permitted",
                        "type": "tuple",
                        "components": [
                            { "name": "token", "type": "address" },
                            { "name": "amount", "type": "uint256" }
                        ]
                    },
                    { "name": "nonce", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" }
                ]
            },
            {
                "name": "transferDetails",
                "type": "tuple",
                "components": [
                    { "name": "to", "type": "address" },
                    { "name": "requestedAmount", "type": "uint256" }
                ]
            },
            { "name": "owner", "type": "address" },
            { "name": "signature", "type": "bytes" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "DOMAIN_SEPARATOR",
        "inputs": [],
        "outputs": [{ "name": "", "type": "bytes32" }],
        "stateMutability": "view"
    }
] as const

// TokenBankPermit2 ABI
export const TOKEN_BANK_PERMIT2_ABI = [
    {
        "type": "constructor",
        "inputs": [
            { "name": "_token", "type": "address" },
            { "name": "_permit2", "type": "address" }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{ "name": "account", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "deposits",
        "inputs": [{ "name": "", "type": "address" }],
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "token",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "permit2",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "deposit",
        "inputs": [{ "name": "amount", "type": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "depositWithPermit2",
        "inputs": [
            {
                "name": "permitTransfer",
                "type": "tuple",
                "components": [
                    {
                        "name": "permitted",
                        "type": "tuple",
                        "components": [
                            { "name": "token", "type": "address" },
                            { "name": "amount", "type": "uint256" }
                        ]
                    },
                    { "name": "nonce", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" }
                ]
            },
            { "name": "owner", "type": "address" },
            { "name": "signature", "type": "bytes" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "withdraw",
        "inputs": [{ "name": "amount", "type": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "Deposit",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Permit2Deposit",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Withdraw",
        "inputs": [
            { "name": "user", "type": "address", "indexed": true },
            { "name": "amount", "type": "uint256", "indexed": false }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "ZeroAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InsufficientBalance",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidToken",
        "inputs": []
    }
] as const

