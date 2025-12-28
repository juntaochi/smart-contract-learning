// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JacNFT
 * @dev 简单的 ERC721 NFT 集合
 */
contract JacNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("Jac NFT Collection", "JACNFT") Ownable(msg.sender) {}

    /**
     * @dev 铸造新的 NFT
     * @param to 接收者地址
     * @return tokenId 新铸造的 NFT ID
     */
    function mint(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _mint(to, tokenId);
        return tokenId;
    }
}
