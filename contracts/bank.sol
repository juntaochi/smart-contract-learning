//编写一个 Bank 合约，实现功能：

// 可以通过 Metamask 等钱包直接给 Bank 合约地址存款
// 在 Bank 合约记录每个地址的存款金额
// 编写 withdraw() 方法，仅管理员可以通过该方法提取资金。
// 用数组记录存款金额的前 3 名用户

pragma solidity^0.8.0;

contract Bank {
    address public admin;
    mapping(address => uint) public balances;// 记录每个地址的存款金额
    address[] public topDepositors;
    uint constant TOP_N = 3;

    constructor() {
        admin = msg.sender;// 部署合约的地址为管理员
    }

    // 直接转账到合约地址时接受并记录存款
    receive() external payable {
        deposit();
        recomputeTopDepositors();
    }

    // 存款函数，允许用户向合约地址发送以太币
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += msg.value;
        recomputeTopDepositors();
    }

    // 提款函数，仅管理员可调用，将合约全部余额转给管理员
    function withdraw() public {
        require(msg.sender == admin, "Only admin can withdraw funds");
        uint amount = address(this).balance;
        require(amount > 0, "No funds to withdraw");
        (bool success, ) = payable(admin).call{value: amount}("");
        require(success, "Transfer failed");
    }


    // 重新计算前3名存款用户（降序）
    function recomputeTopDepositors() internal {
        address user = msg.sender;
        uint userBalance = balances[user];
        bool inList = false;

        // 若已在榜单，仅需排序；否则根据余额考虑加入或替换
        for (uint i = 0; i < topDepositors.length; i++) {
            if (topDepositors[i] == user) {
                inList = true;
                break;
            }
        }

        if (!inList) {
            if (topDepositors.length < TOP_N) {
                topDepositors.push(user);
            } else {
                uint lowestIndex = 0;
                uint lowestBalance = balances[topDepositors[0]];
                for (uint i = 1; i < topDepositors.length; i++) {
                    uint bal = balances[topDepositors[i]];
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
        for (uint i = 0; i < topDepositors.length; i++) {
            for (uint j = i + 1; j < topDepositors.length; j++) {
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
