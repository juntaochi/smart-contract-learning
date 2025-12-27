
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

export const TOKEN_BANK_ADDRESS = '0xd295804891ced6f832673ef1f0ad955a4a5bb75c'
export const ERC20_TOKEN_ADDRESS = '0x132d8a7b73e62094ff6fa73f3f7d1b8d76467dc2'

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
