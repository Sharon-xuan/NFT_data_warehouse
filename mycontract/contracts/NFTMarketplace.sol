// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721, Ownable {
    using SafeMath for uint256;

    struct NFT {
        uint256 id;
        address owner;
        uint256 price;
        bool forSale;
        string name;
        string description;
    }

    mapping (uint256 => NFT) public nfts;

    uint256 public nftCounter;
    uint256 public commissionPercentage;
    address payable public immutable commisionOwner;

    constructor(string memory name, string memory symbol, uint256 commission) ERC721(name, symbol) {
        commissionPercentage = commission;
        commisionOwner = payable(msg.sender);
    }

    function mintNFT() public {
        nftCounter++;
        _safeMint(msg.sender, nftCounter);
        nfts[nftCounter] = NFT(nftCounter, msg.sender, 0, false, "", "");
    }

    function createNFT(uint256 id, string memory name, string memory description) public {
        nftCounter++;
        _safeMint(msg.sender, id);
        nfts[nftCounter] = NFT(id, msg.sender, 0, false, name, description);
    }

    function getNFT(uint256 id) public view returns (NFT memory) {
        return nfts[id];
    }

    function transferNFT(uint256 id, address to) public {
        require(_exists(id), "NFT does not exist.");
        require(ownerOf(id) == msg.sender, "You do not own this NFT.");
        safeTransferFrom(msg.sender, to, id);
        nfts[id].owner = to;
    }

    function listNFTForSale(uint256 id, uint256 price) public {
        require(ownerOf(id) == msg.sender, "You do not own this NFT.");
        require(price > 0, "Price cannot be zero.");
        nfts[id].price = price;
        nfts[id].forSale = true;
    }

    function removeNFTFromSale(uint256 id) public {
        require(ownerOf(id) == msg.sender, "You do not own this NFT.");
        require(nfts[id].forSale == true, "This NFT is not for sale.");
        nfts[id].price = 0;
        nfts[id].forSale = false;
    }

    // commission
    function purchaseNFT(uint256 id) public payable {
        require(nfts[id].forSale == true, "This NFT is not for sale.");
        uint256 commission = nfts[id].price * (commissionPercentage) / 100;//抽成
        //msg->buyer买家,支付的 ETH 是否足够购买这个 NFT
        require(msg.value >= nfts[id].price, "Insufficient funds.");

        // 在购买 NFT 的过程中，函数将 NFT 的价格和佣金分别转账给卖家和合约的佣金所有者（即部署合约的账户）。
        // 具体来说，函数会使用 transfer 函数将 amount（即 NFT 的价格）转账给卖家，
        // 将 commission（即佣金）转账给佣金所有者。这里需要注意的是，使用 transfer 函数的目的是将钱转账给外部账户（即卖家和佣金所有者），而不是合约内部的其他地址，从而避免攻击者利用恶意合约实施重入攻击。
        address payable seller = payable(nfts[id].owner);//卖家，nft拥有者
        uint256 amount = nfts[id].price;//nft价格
        seller.transfer(amount-commission);//卖家得到钱
        commisionOwner.transfer(commission);//平台得到抽成
        
        //将 NFT 的所有权从卖家seller转移到买家buyer，并将 NFT 的价格和出售状态更新为 0 和 false，表示该 NFT 已经不再出售。
        _transfer(seller, msg.sender, id);
        nfts[id].owner = msg.sender;
        nfts[id].price = 0;
        nfts[id].forSale = false;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
