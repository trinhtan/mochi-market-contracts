/** @format */

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert, time } = require('@openzeppelin/test-helpers');

const {
  deployAddressesProvider,
  allSetup,
  deployTestERC721,
  deployTestERC20,
} = require('../helpers');
const { ERRORS, REGULAR_FEE, MOMA_FEE } = require('../constans');

describe('Market', async () => {
  let addressesProvider, nftList, vault, market, sellOrderList, exchangeOrderList;
  let moma;
  let deployer, marketAdmin, alice, bob;
  let dai, link;
  let ETH_Address = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    [deployer, marketAdmin, alice, bob] = await ethers.getSigners();

    addressesProvider = await deployAddressesProvider(deployer);

    moma = await deployTestERC20(deployer, 'MOchi MArket Token', 'MOMA');

    let modules = await allSetup(deployer, addressesProvider, deployer, marketAdmin, moma.address);
    addressesProvider = modules.addressesProvider;
    nftList = modules.nftListProxy;
    vault = modules.vaultProxy;
    market = modules.marketProxy;
    sellOrderList = modules.sellOrderListProxy;
    exchangeOrderList = modules.exchangeOrderListProxy;

    let TestERC20 = await ethers.getContractFactory('TestERC20');
    dai = await TestERC20.connect(deployer).deploy('DAI Token', 'DAI');
    link = await TestERC20.connect(deployer).deploy('LINK Token', 'LINK');
  });

  it('All setup successfully', async () => {
    expect(await nftList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await vault.addressesProvider()).to.equal(addressesProvider.address);
    expect(await sellOrderList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await exchangeOrderList.addressesProvider()).to.equal(addressesProvider.address);
    expect(await market.addressesProvider()).to.equal(addressesProvider.address);
    expect(await addressesProvider.getAdmin()).to.equal(marketAdmin.address);

    let regularFee = await market.getRegularFee();
    expect(regularFee[0]).to.be.equal(REGULAR_FEE.NUMERATOR);
    expect(regularFee[1]).to.be.equal(REGULAR_FEE.DENOMINATOR);

    let momaFee = await market.getMomaFee();
    expect(momaFee[0]).to.be.equal(MOMA_FEE.NUMERATOR);
    expect(momaFee[1]).to.be.equal(MOMA_FEE.DENOMINATOR);

    expect(await market.acceptedToken(ETH_Address)).to.be.equal(true);
    expect(await market.acceptedToken(moma.address)).to.be.equal(true);
  });

  it('User who is not Market Admin calls updateRegularFee fail', async () => {
    await expectRevert(
      market.connect(deployer).updateRegularFee('30', '1000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).updateRegularFee('30', '1000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).updateRegularFee('30', '1000'),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin calls updateRegularFee successfully', async () => {
    await market.connect(marketAdmin).updateRegularFee('30', '1000');

    let fee = await market.getRegularFee();

    expect(fee[0]).to.equal('30');
    expect(fee[1]).to.equal('1000');
  });

  it('User who is not Market Admin calls acceptToken fail', async () => {
    await expectRevert(
      market.connect(deployer).acceptToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).acceptToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).acceptToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );

    await expectRevert(
      market.connect(deployer).acceptToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).acceptToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).acceptToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin calls acceptToken successfully', async () => {
    await market.connect(marketAdmin).acceptToken(dai.address);
    await market.connect(marketAdmin).acceptToken(link.address);

    expect(await market.acceptedToken(dai.address)).to.be.equal(true);
    expect(await market.acceptedToken(link.address)).to.be.equal(true);

    let rewardTokenForDai = await ethers.getContractAt(
      'MochiRewardToken',
      await vault.getRewardToken(dai.address)
    );

    let rewardTokenForLink = await ethers.getContractAt(
      'MochiRewardToken',
      await vault.getRewardToken(link.address)
    );

    expect(await rewardTokenForDai.name()).to.be.equal('rMOCHI for ' + (await dai.name()));
    expect(await rewardTokenForDai.symbol()).to.be.equal('rMOCHI_' + (await dai.symbol()));

    expect(await rewardTokenForLink.name()).to.be.equal('rMOCHI for ' + (await link.name()));
    expect(await rewardTokenForLink.symbol()).to.be.equal('rMOCHI_' + (await link.symbol()));
  });

  it('User who is not Market Admin calls revokeToken fail', async () => {
    await market.connect(marketAdmin).acceptToken(dai.address);
    await market.connect(marketAdmin).acceptToken(link.address);

    await expectRevert(
      market.connect(deployer).revokeToken(ETH_Address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).revokeToken(ETH_Address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).revokeToken(ETH_Address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(deployer).revokeToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).revokeToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).revokeToken(dai.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(deployer).revokeToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(alice).revokeToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
    await expectRevert(
      market.connect(bob).revokeToken(link.address),
      ERRORS.CALLER_NOT_MARKET_ADMIN
    );
  });

  it('Market Admin calls revokeToken successfully', async () => {
    await market.connect(marketAdmin).acceptToken(dai.address);
    await market.connect(marketAdmin).acceptToken(link.address);

    await market.connect(marketAdmin).revokeToken(ETH_Address);
    await market.connect(marketAdmin).revokeToken(dai.address);
    await market.connect(marketAdmin).revokeToken(link.address);

    expect(await market.acceptedToken(ETH_Address)).to.be.equal(false);
    expect(await market.acceptedToken(dai.address)).to.be.equal(false);
    expect(await market.acceptedToken(link.address)).to.be.equal(false);
  });

  describe('User calls createSellOrder fail cause invalid parameters or caller is not owner or NFT is not approved for Market', async () => {
    let acceptedERC721;
    let tokenId = '0';
    beforeEach(async () => {
      acceptedERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(acceptedERC721.address, false);
      await nftList.connect(marketAdmin).acceptNFT(acceptedERC721.address);

      await acceptedERC721.connect(deployer).mint(alice.address, tokenId);
    });

    it('User calls createSellOrder fail with an unregistered NFT', async () => {
      let unregisteredERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(unregisteredERC721.address, '0', '1', '1000', ETH_Address),
        ERRORS.NFT_NOT_ACCEPTED
      );
    });

    it('User calls createSellOrder fail with an registered but unaccepted NFT', async () => {
      let unacceptedERC721 = await deployTestERC721(deployer, 'TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(unacceptedERC721.address, false);

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(unacceptedERC721.address, '0', '1', '1000', ETH_Address),
        ERRORS.NFT_NOT_ACCEPTED
      );
    });

    it('User calls createSellOrder fail cause price is zero', async () => {
      await expectRevert(
        market.connect(alice).createSellOrder(acceptedERC721.address, '0', '1', '0', ETH_Address),
        ERRORS.PRICE_IS_ZERO
      );
    });

    it('User calls createSellOrder fail cause sells with unaccepted token', async () => {
      let unacceptedToken = await deployTestERC20(deployer, 'TestERC20', 'TestERc20');

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, '0', '1', '1000', unacceptedToken.address),
        ERRORS.TOKEN_NOT_ACCEPTED
      );
    });

    it('User calls createSellOrder fail cause amount is not equal 1', async () => {
      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, '0', '0', '1000', ETH_Address),
        ERRORS.AMOUNT_IS_NOT_EQUAL_ONE
      );

      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, '0', '2', '1000', ETH_Address),
        ERRORS.AMOUNT_IS_NOT_EQUAL_ONE
      );
    });

    it('User calls createSellOrder fail cause he is not NFT owner', async () => {
      await expectRevert(
        market
          .connect(bob)
          .createSellOrder(acceptedERC721.address, tokenId, '1', '1000', ETH_Address),
        ERRORS.CALLER_NOT_NFT_OWNER
      );
    });

    it('User calls createSellOrder fail cause he has not approved NFT for Market yet.', async () => {
      await expectRevert(
        market
          .connect(alice)
          .createSellOrder(acceptedERC721.address, tokenId, '1', '1000', ETH_Address),
        ERRORS.NFT_NOT_APPROVED_FOR_MARKET
      );
    });
  });

  describe('Alice createSellOrder (with ERC721 and ETH) successfully', async () => {
    let erc721;
    let tokenId = 0;
    let price = 1000000;
    beforeEach(async () => {
      let TestERC721 = await ethers.getContractFactory('TestERC721');
      erc721 = await TestERC721.connect(deployer).deploy('TestERC721', 'TestERC721');

      await nftList.connect(deployer).registerNFT(erc721.address, false);
      await nftList.connect(marketAdmin).acceptNFT(erc721.address);

      await erc721.connect(deployer).mint(alice.address, tokenId);
      await erc721.connect(alice).setApprovalForAll(market.address, true);
      await market.connect(alice).createSellOrder(erc721.address, tokenId, '1', price, ETH_Address);
    });

    it('Check sell order info by getSellOrderById', async () => {
      expect(await sellOrderList.getSellOrderCount()).to.be.equal(1);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(1);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(ETH_Address);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);

      let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);

      expect(
        await sellOrderList.checkDuplicateERC721(erc721.address, tokenId, alice.address)
      ).to.be.equal(true);
    });

    it('Check sell order info by getSellOrdersByIdList', async () => {
      let result = await sellOrderList.getSellOrdersByIdList([0]);
      let sellOrderInfo = result[0];

      expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
      expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
      expect(sellOrderInfo.amount).to.be.equal(1);
      expect(sellOrderInfo.soldAmount).to.be.equal(0);
      expect(sellOrderInfo.seller).to.be.equal(alice.address);
      expect(sellOrderInfo.price).to.be.equal(price);
      expect(sellOrderInfo.token).to.be.equal(ETH_Address);
      expect(sellOrderInfo.isActive).to.be.equal(true);
      expect(sellOrderInfo.buyers.length).to.be.equal(0);
      expect(sellOrderInfo.buyTimes.length).to.be.equal(0);
    });

    it('Check sellOrder Id is storaged in arrays', async () => {
      let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
      let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
        alice.address
      );
      let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
        alice.address
      );
      let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
        erc721.address
      );
      let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
        erc721.address
      );

      let availableSellOrdersIdListERC721 = [];
      for (let i = 0; i < availableSellOrdersIdList.resultERC721.length; i++) {
        availableSellOrdersIdListERC721[i] = parseInt(availableSellOrdersIdList.resultERC721[i]);
      }

      let allSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
        allSellOrdersIdListByUserERC721[i] = parseInt(allSellOrdersIdListByUser[i]);
      }

      let availableSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByUser.resultERC721.length; i++) {
        availableSellOrdersIdListByUserERC721[i] = parseInt(
          availableSellOrdersIdListByUser.resultERC721[i]
        );
      }

      let allSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
        allSellOrdersIdListByNftAddressERC721[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
      }

      let availableSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
        availableSellOrdersIdListByNftAddressERC721[i] = parseInt(
          availableSellOrdersIdListByNftAddress[i]
        );
      }

      expect(availableSellOrdersIdListERC721).to.be.include(0);
      expect(allSellOrdersIdListByUserERC721).to.be.include(0);
      expect(availableSellOrdersIdListByUserERC721).to.be.include(0);
      expect(allSellOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableSellOrdersIdListByNftAddressERC721).to.be.include(0);
    });

    it('User who is not seller calls cancleSellOrder fail', async () => {
      await expectRevert(market.connect(bob).cancleSellOrder(0), ERRORS.CALLER_NOT_SELLER);
    });

    it('User who is not seller calls cancleSellOrder successfully', async () => {
      await market.connect(alice).cancleSellOrder(0);

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.isActive).to.be.equal(false);

      let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
      let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
        alice.address
      );
      let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
        alice.address
      );
      let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
        erc721.address
      );
      let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
        erc721.address
      );

      let availableSellOrdersIdListERC721 = [];
      for (let i = 0; i < availableSellOrdersIdList.resultERC721.length; i++) {
        availableSellOrdersIdListERC721[i] = parseInt(availableSellOrdersIdList.resultERC721[i]);
      }

      let allSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
        allSellOrdersIdListByUserERC721[i] = parseInt(allSellOrdersIdListByUser[i]);
      }

      let availableSellOrdersIdListByUserERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByUser.resultERC721.length; i++) {
        availableSellOrdersIdListByUserERC721[i] = parseInt(
          availableSellOrdersIdListByUser.resultERC721[i]
        );
      }

      let allSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
        allSellOrdersIdListByNftAddressERC721[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
      }

      let availableSellOrdersIdListByNftAddressERC721 = [];
      for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
        availableSellOrdersIdListByNftAddressERC721[i] = parseInt(
          availableSellOrdersIdListByNftAddress[i]
        );
      }

      expect(availableSellOrdersIdList.resultERC721).to.be.not.include(0);
      expect(allSellOrdersIdListByUserERC721).to.be.include(0);
      expect(availableSellOrdersIdListByUserERC721).to.be.not.include(0);
      expect(allSellOrdersIdListByNftAddressERC721).to.be.include(0);
      expect(availableSellOrdersIdListByNftAddressERC721).to.be.not.include(0);

      let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
      expect(latestId.found).to.be.equal(true);
      expect(latestId.id).to.be.equal(0);

      expect(
        await sellOrderList.checkDuplicateERC721(erc721.address, tokenId, alice.address)
      ).to.be.equal(false);
    });

    it('User calls cancleSellOrder fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancleSellOrder(0);
      await expectRevert(market.connect(alice).cancleSellOrder(0), ERRORS.SELL_ORDER_NOT_ACTIVE);
    });

    it('User who is not seller calls updatePrice fail', async () => {
      await expectRevert(market.connect(bob).updatePrice(0, '1000'), ERRORS.CALLER_NOT_SELLER);
    });

    it('User calls updatePrice fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancleSellOrder(0);
      await expectRevert(
        market.connect(alice).updatePrice(0, '1000'),
        ERRORS.SELL_ORDER_NOT_ACTIVE
      );
    });

    it('User calls updatePrice fail cause newPrice equal oldPrice', async () => {
      await expectRevert(market.connect(alice).updatePrice(0, '1000000'), ERRORS.PRICE_NOT_CHANGE);
    });

    it('User calls updatePrice successfully', async () => {
      await market.connect(alice).updatePrice(0, '2000000');

      let sellOrderInfo = await sellOrderList.getSellOrderById(0);
      expect(sellOrderInfo.price).to.be.equal('2000000');
    });

    it('User calls buy fail cause he is seller', async () => {
      await expectRevert(
        market.connect(alice).buy('0', '1', alice.address, '0x'),
        ERRORS.CALLER_IS_SELLER
      );
    });

    it('User calls buy fail cause sellOrder is not active', async () => {
      await market.connect(alice).cancleSellOrder(0);
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x'),
        ERRORS.SELL_ORDER_NOT_ACTIVE
      );
    });

    it('User calls buy fail cause amount wants to buy is zero', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '0', bob.address, '0x'),
        ERRORS.AMOUNT_IS_ZERO
      );
    });

    it('User calls buy fail cause amount is not enough', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '2', bob.address, '0x'),
        ERRORS.AMOUNT_IS_NOT_ENOUGH
      );
    });

    it('User calls buy fail cause msg.value is not equal price', async () => {
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price - 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );

      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price + 1 }),
        ERRORS.VALUE_NOT_EQUAL_PRICE
      );
    });

    it('User calls buy fail cause seller transfed nft', async () => {
      await erc721.connect(alice).transferFrom(alice.address, deployer.address, tokenId);
      await expectRevert.unspecified(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price })
      );
    });

    it('User calls buy fail cause seller revoke approval', async () => {
      await erc721.connect(alice).setApprovalForAll(market.address, false);
      await expectRevert(
        market.connect(bob).buy('0', '1', bob.address, '0x', { value: price }),
        'ERC721: transfer caller is not owner nor approved'
      );
    });

    describe('User calls buy successfully (without reward token)', async () => {
      let aliceBeforeBalance;
      beforeEach(async () => {
        aliceBeforeBalance = await ethers.provider.getBalance(alice.address);
        await market.connect(bob).buy('0', '1', bob.address, '0x', { value: price });
      });

      it('Check balance and ownership', async () => {
        let aliceAfterBalance = await ethers.provider.getBalance(alice.address);

        expect(aliceAfterBalance).to.be.gt(aliceBeforeBalance);
        expect(await erc721.ownerOf(tokenId)).to.be.equal(bob.address);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await ethers.provider.getBalance(vault.address)).to.be.equal((price * 25) / 1000);
        expect(await vault.getMochiFund(ETH_Address)).to.be.equal(
          (((price * 25) / 1000) * 80) / 100
        );
        expect(await vault.getRoyalty(erc721.address, ETH_Address)).to.be.equal(
          (((price * 25) / 1000) * 20) / 100
        );

        let ethRewardToken = await vault.getRewardToken(ETH_Address);
        expect(await vault.getRewardTokenBalance(alice.address, ethRewardToken)).to.be.equal(0);
      });

      it('Check sellOrderInfo', async () => {
        let sellOrderInfo = await sellOrderList.getSellOrderById(0);
        expect(sellOrderInfo.nftAddress).to.be.equal(erc721.address);
        expect(sellOrderInfo.tokenId).to.be.equal(tokenId);
        expect(sellOrderInfo.amount).to.be.equal(1);
        expect(sellOrderInfo.soldAmount).to.be.equal(1);
        expect(sellOrderInfo.seller).to.be.equal(alice.address);
        expect(sellOrderInfo.price).to.be.equal(price);
        expect(sellOrderInfo.token).to.be.equal(ETH_Address);
        expect(sellOrderInfo.isActive).to.be.equal(false);
        expect(sellOrderInfo.buyers).to.be.include(bob.address);
        expect(sellOrderInfo.buyTimes.length).to.be.equal(1);

        let latestId = await sellOrderList.getLatestSellIdERC721(erc721.address, tokenId);
        expect(latestId.found).to.be.equal(true);
        expect(latestId.id).to.be.equal(0);

        expect(
          await sellOrderList.checkDuplicateERC721(erc721.address, tokenId, alice.address)
        ).to.be.equal(false);
      });

      it('Check arrays', async () => {
        let availableSellOrdersIdList = await sellOrderList.getAvailableSellOrdersIdList();
        let allSellOrdersIdListByUser = await sellOrderList.getAllSellOrdersIdListByUser(
          alice.address
        );
        let availableSellOrdersIdListByUser = await sellOrderList.getAvailableSellOrdersIdListByUser(
          alice.address
        );
        let allSellOrdersIdListByNftAddress = await sellOrderList.getAllSellOrdersIdListByNftAddress(
          erc721.address
        );
        let availableSellOrdersIdListByNftAddress = await sellOrderList.getAvailableSellOrdersIdListByNftAddress(
          erc721.address
        );

        let availableSellOrdersIdListERC721 = [];
        for (let i = 0; i < availableSellOrdersIdList.resultERC721.length; i++) {
          availableSellOrdersIdListERC721[i] = parseInt(availableSellOrdersIdList.resultERC721[i]);
        }

        let allSellOrdersIdListByUserERC721 = [];
        for (let i = 0; i < allSellOrdersIdListByUser.length; i++) {
          allSellOrdersIdListByUserERC721[i] = parseInt(allSellOrdersIdListByUser[i]);
        }

        let availableSellOrdersIdListByUserERC721 = [];
        for (let i = 0; i < availableSellOrdersIdListByUser.resultERC721.length; i++) {
          availableSellOrdersIdListByUserERC721[i] = parseInt(
            availableSellOrdersIdListByUser.resultERC721[i]
          );
        }

        let allSellOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < allSellOrdersIdListByNftAddress.length; i++) {
          allSellOrdersIdListByNftAddressERC721[i] = parseInt(allSellOrdersIdListByNftAddress[i]);
        }

        let availableSellOrdersIdListByNftAddressERC721 = [];
        for (let i = 0; i < availableSellOrdersIdListByNftAddress.length; i++) {
          availableSellOrdersIdListByNftAddressERC721[i] = parseInt(
            availableSellOrdersIdListByNftAddress[i]
          );
        }

        expect(availableSellOrdersIdList.resultERC721).to.be.not.include(0);
        expect(allSellOrdersIdListByUserERC721).to.be.include(0);
        expect(availableSellOrdersIdListByUserERC721).to.be.not.include(0);
        expect(allSellOrdersIdListByNftAddressERC721).to.be.include(0);
        expect(availableSellOrdersIdListByNftAddressERC721).to.be.not.include(0);
      });

      it('Seller cannot cancleSellOrder cause sellOrder was completed', async () => {
        await expectRevert(
          market.connect(alice).cancleSellOrder('0'),
          ERRORS.SELL_ORDER_NOT_ACTIVE
        );
      });

      it('User cannot buy a sellOrder was completed', async () => {
        await expectRevert(
          market.connect(bob).buy('0', '1', bob.address, '0x', { value: price }),
          ERRORS.SELL_ORDER_NOT_ACTIVE
        );
      });
    });
  });
});
