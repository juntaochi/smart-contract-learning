// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MemeToken.sol";

contract MemeFactory is Ownable {
    address public implementation;
    
    struct MemeInfo {
        address deployer;
        uint256 price;
        bool exists;
    }
    
    mapping(address => MemeInfo) public memes;
    address[] public allMemes;

    event MemeDeployed(address indexed tokenAddr, string symbol, uint256 totalSupply, uint256 perMint, uint256 price, address indexed deployer);
    event MemeMinted(address indexed tokenAddr, address indexed minter, uint256 amount, uint256 fee);

    constructor(address _implementation) Ownable(msg.sender) {
        implementation = _implementation;
    }

    function deployMeme(
        string memory symbol,
        uint256 totalSupply,
        uint256 perMint,
        uint256 price
    ) external returns (address) {
        address proxy = Clones.clone(implementation);
        MemeToken(proxy).initialize(symbol, totalSupply, perMint, address(this));
        
        memes[proxy] = MemeInfo({
            deployer: msg.sender,
            price: price,
            exists: true
        });
        
        allMemes.push(proxy);
        
        emit MemeDeployed(proxy, symbol, totalSupply, perMint, price, msg.sender);
        
        return proxy;
    }

    function mintMeme(address tokenAddr) external payable {
        MemeInfo storage info = memes[tokenAddr];
        require(info.exists, "Meme does not exist");
        require(msg.value >= info.price, "Insufficient payment");

        // Fee distribution
        // 1% to factory owner (project party), remaining to token deployer
        uint256 projectFee = info.price * 1 / 100;
        uint256 deployerFee = info.price - projectFee;

        // Transfer project fee
        (bool successProject, ) = payable(owner()).call{value: projectFee}("");
        require(successProject, "Project fee transfer failed");

        // Transfer deployer fee
        (bool successDeployer, ) = payable(info.deployer).call{value: deployerFee}("");
        require(successDeployer, "Deployer fee transfer failed");

        // Refund excess if any
        if (msg.value > info.price) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - info.price}("");
            require(successRefund, "Refund failed");
        }

        // Mint tokens
        MemeToken(tokenAddr).mint(msg.sender);
        
        emit MemeMinted(tokenAddr, msg.sender, MemeToken(tokenAddr).perMint(), info.price);
    }

    function getAllMemes() external view returns (address[] memory) {
        return allMemes;
    }
}
