pragma solidity ^0.8.0;

interface IBank {
    function deposit() external payable;
    function withdraw() external;
}

contract Bank is IBank {
    address public admin;
    mapping(address => uint256) public balances; // 记录每个地址的存款金额
    address[] public topDepositors;
    uint256 constant TOP_N = 3;

    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender; // 部署合约的地址为管理员
    }

    // 直接转账到合约地址时接受并记录存款
    receive() external payable virtual {
        deposit();
    }

    // 存款函数，允许用户向合约地址发送以太币
    function deposit() public payable virtual override {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += msg.value;
        recomputeTopDepositors();
    }

    // 提款函数，仅管理员可调用，将合约全部余额转给管理员
    function withdraw() public virtual override onlyAdmin {
        uint256 amount = address(this).balance;
        require(amount > 0, "No funds to withdraw");
        (bool success, ) = payable(admin).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // 重新计算前3名存款用户（降序）
    function recomputeTopDepositors() internal {
        address user = msg.sender;
        uint256 userBalance = balances[user];
        bool inList = false;

        // 若已在榜单，仅需排序；否则根据余额考虑加入或替换
        for (uint256 i = 0; i < topDepositors.length; i++) {
            if (topDepositors[i] == user) {
                inList = true;
                break;
            }
        }

        if (!inList) {
            if (topDepositors.length < TOP_N) {
                topDepositors.push(user);
            } else {
                uint256 lowestIndex = 0;
                uint256 lowestBalance = balances[topDepositors[0]];
                for (uint256 i = 1; i < topDepositors.length; i++) {
                    uint256 bal = balances[topDepositors[i]];
                    if (bal < lowestBalance) {
                        lowestBalance = bal;
                        lowestIndex = i;
                    }
                }
                if (userBalance > lowestBalance) {
                    topDepositors[lowestIndex] = user;
                }
            }
        }

        // 按存款额降序排序
        for (uint256 i = 0; i < topDepositors.length; i++) {
            for (uint256 j = i + 1; j < topDepositors.length; j++) {
                if (balances[topDepositors[j]] > balances[topDepositors[i]]) {
                    (topDepositors[i], topDepositors[j]) = (topDepositors[j], topDepositors[i]);
                }
            }
        }
    }

    // 获取前3名存款用户
    function getTopDepositors() public view returns (address[] memory) {
        return topDepositors;
    }
}

contract BigBank is Bank {
    uint256 public constant MIN_DEPOSIT = 0.001 ether;

    modifier meetsMinimum() {
        require(msg.value >= MIN_DEPOSIT, "Deposit below minimum");
        _;
    }

    function deposit() public payable override meetsMinimum {
        super.deposit();
    }

    receive() external payable override meetsMinimum {
        deposit();
    }

    // 支持管理员转移
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin is zero address");
        address previous = admin;
        admin = newAdmin;
        emit AdminTransferred(previous, newAdmin);
    }
}

contract Admin {
    address public owner;

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        address previous = owner;
        owner = newOwner;
        emit OwnerTransferred(previous, newOwner);
    }

    // 仅 Owner 可调用，让 Admin 合约作为管理员从 Bank 合约取钱
    function adminWithdraw(IBank bank) external onlyOwner {
        bank.withdraw();
    }

    // 提供 owner 从 Admin 合约取回资金的能力
    function withdrawToOwner() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No funds to withdraw");
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdraw failed");
    }

    receive() external payable {}
}
