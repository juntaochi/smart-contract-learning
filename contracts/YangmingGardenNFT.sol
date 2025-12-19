// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YangmingGardenNFT
 * @dev ERC721 NFT合约，使用OpenZeppelin库
 * @notice 用于铸造阳明花园相关的NFT
 */
contract YangmingGardenNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("YangmingGardenNFT", "YMNFT") Ownable(msg.sender) {}

    /**
     * @dev 铸造新的NFT
     * @param to 接收NFT的地址
     * @param uri NFT元数据的IPFS URI
     * @return tokenId 新铸造的NFT的ID
     */
    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    /**
     * @dev 批量铸造NFT
     * @param to 接收NFT的地址
     * @param uris NFT元数据的IPFS URI数组
     */
    function batchMint(address to, string[] memory uris) public onlyOwner {
        for (uint256 i = 0; i < uris.length; i++) {
            safeMint(to, uris[i]);
        }
    }

    /**
     * @dev 获取当前已铸造的NFT数量
     */
    function totalMinted() public view returns (uint256) {
        return _nextTokenId;
    }

    // 以下函数是重写以解决多重继承冲突

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
