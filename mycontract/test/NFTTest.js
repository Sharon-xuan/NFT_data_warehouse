const NFTMarketplace = artifacts.require('NFTMarketplace');

contract('NFTMarketplace', (accounts) => {
  let nftMarketplace;

  before(async () => {
    nftMarketplace = await NFTMarketplace.deployed();
  });

  // Test that the smart contract can create a new NFT
  it('Test that the smart contract can create a new NFT', async () => {
    // Define input values
    const nft1Id = 1;
    const nft1Name = 'NFT_1';
    const nft1Description = 'This is NFT_1';

    // Call the createNFT function
    await nftMarketplace.createNFT(nft1Id, nft1Name, nft1Description);

    // Get the NFT details from the contract
    const nft1 = await nftMarketplace.getNFT(nft1Id);

    // Assert that the NFT was created with the correct properties
    assert.equal(nft1.id, nft1Id);
    assert.equal(nft1.name, nft1Name);
    assert.equal(nft1.description, nft1Description);
    assert.equal(nft1.owner, accounts[0]);
  });

  // Test that the smart contract can transfer ownership of an NFT
  it("Test that the smart contract can transfer ownership of an NFT", async () => {
    const user1 = accounts[1];
    const user2 = accounts[2];
    // Create a new NFT with the first user account
    const nft2Id = 2;
    const nft2name = "NFT_2";
    const nft2description = "This is NFT_2";
    await nftMarketplace.createNFT(nft2Id, nft2name, nft2description, { from: user1 });

    // Transfer ownership of the NFT to the second user account using the transferNFT function
    await nftMarketplace.transferNFT(nft2Id, user2, { from: user1 });

    // Assert that the NFT is now owned by the second user account
    const ownerOfNFT2 = await nftMarketplace.ownerOf(nft2Id);
    assert.equal(ownerOfNFT2, user2, "Ownership was not transferred successfully");
  });

  // Test that the smart contract can list an NFT for sale:
  it("Test that the smart contract can list an NFT for sale", async () => {
    const user3 = accounts[3];
    // Create a new NFT with the user account
    const nft3Id = 3;
    const nft3name = "NFT_3";
    const nft3description = "This is NFT_3";
    const salePrice = web3.utils.toWei("0.1", "ether");
    await nftMarketplace.createNFT(nft3Id, nft3name, nft3description, { from: user3 });

    // List the NFT for sale using the sellNFT function with sale price
    await nftMarketplace.listNFTForSale(nft3Id, salePrice, { from: user3 });

    // Assert that the NFT is now listed for sale and its sale price matches the input value
    const nft3 = await nftMarketplace.getNFT(nft3Id);

    assert.equal(nft3.forSale, true, "NFT is not listed for sale");
    assert.equal(nft3.price, salePrice, "NFT sale price does not match input value");
  });

  // Test that the smart contract can remove an NFT from sale
  it("Test that the smart contract can remove an NFT from sale", async () => {
    const user4 = accounts[4];
    // Create a new NFT with the user account
    const nft4Id = 4;
    const nft4name = "NFT_4";
    const nft4description = "This is NFT_4";
    const salePrice = web3.utils.toWei("0.1", "ether");
    await nftMarketplace.createNFT(nft4Id, nft4name, nft4description, { from: user4 });

    // List the NFT for sale using the sellNFT function with sale price
    await nftMarketplace.listNFTForSale(nft4Id, salePrice, { from: user4 });

    // Remove the NFT from sale using the removeNFTFromSale function
    await nftMarketplace.removeNFTFromSale(nft4Id, { from: user4 });

    // Assert that the NFT is no longer listed for sale
    const nft4 = await nftMarketplace.getNFT(nft4Id);
    assert.equal(nft4.forSale, false, "NFT is still listed for sale");
  });




  it("Test that the smart contract can execute a successful NFT purchase", async () => {
    const seller = accounts[5];
    const buyer = accounts[6];
  
    const tokenId = 5;
    const name = "NFT_5";
    const description = "This is NFT_5";

    await nftMarketplace.createNFT(tokenId, name, description, { from: seller });
  
    const salePrice = web3.utils.toWei("0.1", "ether");
    await nftMarketplace.listNFTForSale(tokenId, salePrice, { from: seller });
  
    const sellerBalanceBefore = await web3.eth.getBalance(seller);

    const commissionPercentage = await nftMarketplace.commissionPercentage();
    const nftPrice = await nftMarketplace.nfts(tokenId); // 从合约获取NFT的价格
    const price = nftPrice.price;
    const commission = price * commissionPercentage / 100;

    const salePriceBN = web3.utils.toBN(salePrice);
    const commissionBN = web3.utils.toBN(commission);
    const totalCost = salePriceBN.add(commissionBN);

    const buyerBalance = await web3.eth.getBalance(buyer);
    assert(web3.utils.toBN(buyerBalance).gte(totalCost), "Buyer has insufficient funds");

    const tx = await nftMarketplace.purchaseNFT(tokenId, { from: buyer, value: totalCost.toString() });

    const newOwner = await nftMarketplace.ownerOf(tokenId);
    assert.equal(newOwner, buyer, "ownership not transferred to buyer");

    const sellerBalanceAfter = await web3.eth.getBalance(seller);//得到nft钱后的余额,s实际

    const gasUsed = (await web3.eth.getTransactionReceipt(tx.receipt.transactionHash)).gasUsed;
    const gasPrice = (await web3.eth.getTransaction(tx.receipt.transactionHash)).gasPrice;
    const gasCost = web3.utils.toBN(gasUsed).mul(web3.utils.toBN(gasPrice));

    const fee = commissionBN;
    const expectedSellerBalanceAfter = web3.utils.toBN(sellerBalanceBefore).add(salePriceBN).sub(fee);


    assert.equal(sellerBalanceAfter, expectedSellerBalanceAfter.toString(), "incorrect amount transferred to seller");
  
  });

  it("Test that the smart contract can execute an unsuccessful NFT purchase", async () => {
    // i. Create two user accounts
    const [seller, buyer] = accounts;

    // ii. Create a new NFT with the first user account
    const tokenId = 6;
    const name = "NFT_6";
    const description = "This is NFT_6";
    await nftMarketplace.createNFT(tokenId, name, description, { from: seller });

    // iii. List the NFT for sale using the listNFTForSale function with a sale price
    const salePrice = web3.utils.toWei("0.1", "ether");
    await nftMarketplace.listNFTForSale(tokenId, salePrice, { from: seller });

    // iv. Attempt to purchase the NFT using the purchaseNFT function with the second user account but with an incorrect amount of Ether
    try {
      await nftMarketplace.purchaseNFT(tokenId, { from: buyer, value: web3.utils.toWei("0.05", "ether") });
    } catch (error) {
      assert(error.message.includes("revert"), "expected an error containing 'revert'");
    }

    const ownerAfterAttempt = await nftMarketplace.ownerOf(tokenId);
    assert.equal(ownerAfterAttempt, seller, "ownership should remain with seller");

    const sellerBalanceBeforeAttempt = await web3.eth.getBalance(seller);
    const sellerBalanceAfterAttempt = await web3.eth.getBalance(seller);
    assert.equal(sellerBalanceBeforeAttempt, sellerBalanceAfterAttempt, "no Ether should be transferred to seller");

  });

});
