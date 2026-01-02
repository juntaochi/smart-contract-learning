// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ERC20Inscription.sol";

contract InscriptionFactory {
    address public immutable implementation;
    address[] public allInscriptions;
    mapping(address => bool) public isInscription;

    event InscriptionDeployed(
        address indexed tokenAddr,
        string symbol,
        uint256 totalSupply,
        uint256 perMint
    );

    constructor() {
        implementation = address(new ERC20Inscription());
    }

    function deployInscription(
        string memory symbol,
        uint256 totalSupply,
        uint256 perMint
    ) external returns (address) {
        address clone = Clones.clone(implementation);
        ERC20Inscription(clone).initialize(
            symbol,
            symbol,
            totalSupply,
            perMint
        );

        allInscriptions.push(clone);
        isInscription[clone] = true;

        emit InscriptionDeployed(clone, symbol, totalSupply, perMint);
        return clone;
    }

    function mintInscription(address tokenAddr) external {
        require(isInscription[tokenAddr], "Not a valid inscription");
        ERC20Inscription(tokenAddr).mint(msg.sender);
    }

    function getInscriptionsCount() external view returns (uint256) {
        return allInscriptions.length;
    }
}
