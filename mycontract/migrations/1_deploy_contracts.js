var Migrations = artifacts.require("./Migrations.sol");
var NFTMarketplace = artifacts.require("./NFTMarketplace.sol");

module.exports = function(deployer) {
    deployer.deploy(Migrations);
    deployer.link(Migrations, NFTMarketplace);
    deployer.deploy(NFTMarketplace, "My NFT Marketplace", "NFTM", 1);
    // deployer.deploy(NFTMarketplace);
};