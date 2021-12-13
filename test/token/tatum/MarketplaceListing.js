const { BN, constants, expectEvent, balance } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { BigNumber } = require("ethers");
const { ZERO_ADDRESS } = constants;

const MarketplaceListing = artifacts.require('MarketplaceListing');
const ERC721Mock = artifacts.require('ERC721Mock');
const Tatum721Mock = artifacts.require('Tatum721');
const ERC721Provenance = artifacts.require('Tatum721Provenance');
const ERC1155Mock = artifacts.require('ERC1155Mock');
const ERC20Mock = artifacts.require('ERC20Mock');

contract('MarketplaceListing', function (accounts) {
    const [marketOwner, seller, buyer, marketOwner1155, seller1155, buyer1155, a1, a2] = accounts;


    const name = 'My Token';
    const symbol = 'MTKN';

    describe('Should pass OK marketplace journeys', () => {
        it('create OK ERC721 listing for native asset', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintWithTokenURI(seller, tokenId, "test.com");

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, ZERO_ADDRESS)

            expectEvent(c, 'ListingCreated', {
                listingId: '1',
                isErc721: true,
                nftAddress,
                tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: ZERO_ADDRESS
            })
            await token.approve(marketplace.address, tokenId, { from: seller });

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            const sellerBalance = (await balance.current(seller)).toString();
            const marketBalance = (await balance.current(marketOwner)).toString();
            const b = await marketplace.buyAssetFromListing('1', ZERO_ADDRESS, { from: buyer, value: 10100 });
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
            expect((await balance.current(marketOwner)).toString()).to.be.equal(BigNumber.from(marketBalance).add(100).toString())
            expect((await balance.current(seller)).toString()).to.be.equal(BigNumber.from(sellerBalance).add(10000).toString())
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 listing for ERC20 asset', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintWithTokenURI(seller, tokenId, "test.com");

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, erc20.address)

            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: erc20.address
            })
            await token.approve(marketplace.address, tokenId, { from: seller });

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })

            expect((await erc20.balanceOf(seller)).toString()).to.be.equal('0')
            expect((await erc20.balanceOf(marketOwner)).toString()).to.be.equal('0')
            const b = await marketplace.buyAssetFromListing('1', erc20.address, { from: buyer });
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('989900')
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect((await erc20.balanceOf(seller)).toString()).to.be.equal('10000')
            expect((await erc20.balanceOf(marketOwner)).toString()).to.be.equal('100')
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 listing for ERC20 asset with cashback', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultipleCashback([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], erc20.address);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, erc20.address)

            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: erc20.address
            })
            await token.approve(marketplace.address, tokenId, { from: seller });

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(token.address, new BN(20), { from: buyer })

            expect((await erc20.balanceOf(seller)).toString()).to.be.equal('0')
            expect((await erc20.balanceOf(marketOwner)).toString()).to.be.equal('0')
            const b = await marketplace.buyAssetFromListing('1', erc20.address, { from: buyer });
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('989880')
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect((await erc20.balanceOf(seller)).toString()).to.be.equal('10000')
            expect((await erc20.balanceOf(marketOwner)).toString()).to.be.equal('100')
            expect((await erc20.balanceOf(a1)).toString()).to.be.equal('10')
            expect((await erc20.balanceOf(a2)).toString()).to.be.equal('10')
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 listing for native asset but erc cashback', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultipleCashback([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], erc20.address);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, '0x0000000000000000000000000000000000000000', { from: seller, value: new BN(50) })
            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId: tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: '0x0000000000000000000000000000000000000000'
            })
            await token.approve(marketplace.address, tokenId, { from: seller });
            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(nftAddress, new BN(10100), { from: buyer })

            const b = await marketplace.buyAssetFromListing('1', '0x0000000000000000000000000000000000000000', { from: buyer, value: new BN(12000) });

            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 listing for erc asset but native cashback', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultipleCashback([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]]);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, erc20.address, { from: seller, value: new BN(50) })
            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId: tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: erc20.address
            })
            await token.approve(marketplace.address, tokenId, { from: seller });
            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(nftAddress, new BN(10100), { from: buyer })

            const b = await marketplace.buyAssetFromListing('1', erc20.address, { from: buyer, value: new BN(12000) });
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 Provenance listing for erc asset but native cashback', async function () {
            const token = await ERC721Provenance.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultiple([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]]);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, erc20.address, { from: seller, value: new BN(50) })
            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId: tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: erc20.address
            })
            await token.approve(marketplace.address, tokenId, { from: seller });
            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(nftAddress, new BN(10100), { from: buyer })

            const b = await marketplace.buyAssetFromListing('1', erc20.address, { from: buyer, value: new BN(12000) });
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 Provenance listing for native asset but erc cashback', async function () {
            const token = await ERC721Provenance.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultiple([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], erc20.address);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, '0x0000000000000000000000000000000000000000', { from: seller, value: new BN(50) })
            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId: tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: '0x0000000000000000000000000000000000000000'
            })
            await token.approve(marketplace.address, tokenId, { from: seller });
            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(nftAddress, new BN(10100), { from: buyer })

            const b = await marketplace.buyAssetFromListing('1', '0x0000000000000000000000000000000000000000', { from: buyer, value: new BN(12000) });

            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 Provenance listing for native asset', async function () {
            const token = await ERC721Provenance.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultiple([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]]);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, '0x0000000000000000000000000000000000000000', { from: seller, value: new BN(50) })
            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId: tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: '0x0000000000000000000000000000000000000000'
            })
            await token.approve(marketplace.address, tokenId, { from: seller });
            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');

            const b = await marketplace.buyAssetFromListing('1', '0x0000000000000000000000000000000000000000', { from: buyer, value: new BN(12000) });
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC721 Provenance listing for ERC20 asset', async function () {
            const token = await ERC721Provenance.new(name, symbol, false);
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer, 1000000)
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mintMultiple([seller, seller], [tokenId, tokenId + 1], ["test.com", "test.com"], [[a1, a2], [a1, a2]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], [[new BN(10), new BN(10)], [new BN(10), new BN(10)]], erc20.address);
            // await token.mint(seller, tokenId);
            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(token.address, new BN(10100), { from: buyer })

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, erc20.address)
            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId: tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: erc20.address
            })
            await token.approve(marketplace.address, tokenId, { from: seller });
            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('1000000')

            await erc20.approve(marketplace.address, new BN(10100), { from: buyer })
            await erc20.approve(nftAddress, new BN(10100), { from: buyer })

            expect((await erc20.balanceOf(seller)).toString()).to.be.equal('0')
            expect((await erc20.balanceOf(marketOwner)).toString()).to.be.equal('0')
            const b = await marketplace.buyAssetFromListing('1', erc20.address, { from: buyer });
            // balance= balance- amount -fees -cashbacks
            expect((await erc20.balanceOf(buyer)).toString()).to.be.equal('989880')
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer);
            expectEvent(b, 'ListingSold', {
                buyer,
            })
            expect((await erc20.balanceOf(seller)).toString()).to.be.equal('10000')
            expect((await erc20.balanceOf(marketOwner)).toString()).to.be.equal('100')
            expect((await erc20.balanceOf(a1)).toString()).to.be.equal('10')
            expect((await erc20.balanceOf(a2)).toString()).to.be.equal('10')
            expect(await token.ownerOf(tokenId)).to.be.equal(buyer);
        });
        it('create OK ERC1155 listing for native asset', async function () {
            const token = await ERC1155Mock.new('https://token-cdn-domain/{id}.json');
            const fee = new BN(100); // 1%


            const marketplace = await MarketplaceListing.new(200, marketOwner1155);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mint(seller1155, tokenId, new BN(10), 0x0);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', false, nftAddress, tokenId, 10000, seller1155, 5, ZERO_ADDRESS)

            expectEvent(c, 'ListingCreated', {
                isErc721: false,
                nftAddress,
                tokenId,
                amount: new BN(5),
                price: new BN(10000),
                erc20Address: ZERO_ADDRESS
            })
            await token.safeTransferFrom(seller1155, marketplace.address, tokenId, new BN(5), 0x0, { from: seller1155 });

            expect((await token.balanceOf(marketplace.address, tokenId)).toString()).to.be.equal('5');

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            // expect((await balance.current(buyer1155, 'ether')).toString()).to.be.equal('10000')
            const seller1155Balance = (await balance.current(seller1155)).toString();
            const marketBalance = (await balance.current(marketOwner1155)).toString();

            const b = await marketplace.buyAssetFromListing('1', ZERO_ADDRESS, { from: buyer1155, value: 10100 });
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer1155);
            expectEvent(b, 'ListingSold', {
                buyer: buyer1155,
            })

            expect((await token.balanceOf(buyer1155, tokenId)).toString()).to.be.equal('5');
            expect((await balance.current(marketOwner1155)).toString()).to.be.equal(BigNumber.from(marketBalance).add(100).toString())
            expect((await balance.current(seller1155)).toString()).to.be.equal(BigNumber.from(seller1155Balance).add(10000).toString())
        });
        it('create OK ERC1155 listing for ERC20 asset', async function () {
            const token = await ERC1155Mock.new('https://token-cdn-domain/{id}.json');
            const fee = new BN(100); // 1%

            const erc20 = await ERC20Mock.new(name, symbol, buyer1155, 1000000)
            expect((await erc20.balanceOf(buyer1155)).toString()).to.be.equal('1000000')

            const marketplace = await MarketplaceListing.new(200, marketOwner1155);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(new BN(200).toString());
            await marketplace.setMarketplaceFee(fee);
            expect((await marketplace.getMarketplaceFee()).toString()).to.equal(fee.toString());

            const tokenId = new BN(1);
            await token.mint(seller1155, tokenId, new BN(10), 0x0);

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', false, nftAddress, tokenId, 10000, seller1155, 5, erc20.address)

            expectEvent(c, 'ListingCreated', {
                isErc721: false,
                nftAddress,
                tokenId,
                amount: new BN(5),
                price: new BN(10000),
                erc20Address: erc20.address
            })
            await token.safeTransferFrom(seller1155, marketplace.address, tokenId, new BN(5), 0x0, { from: seller1155 });

            expect((await token.balanceOf(marketplace.address, tokenId)).toString()).to.be.equal('5');

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');
            expect((await erc20.balanceOf(buyer1155)).toString()).to.be.equal('1000000')

            await erc20.approve(marketplace.address, new BN(10100), { from: buyer1155 })
            expect((await erc20.balanceOf(seller1155)).toString()).to.be.equal('0')
            expect((await erc20.balanceOf(marketOwner1155)).toString()).to.be.equal('0')
            const b = await marketplace.buyAssetFromListing('1', erc20.address, { from: buyer1155 });
            expect((await erc20.balanceOf(buyer1155)).toString()).to.be.equal('989900')
            listings = await marketplace.getListing('1');
            expect(listings[2]).to.be.equal('1');
            expect(listings[9]).to.be.equal(buyer1155);
            expectEvent(b, 'ListingSold', {
                buyer: buyer1155,
            })
            expect((await token.balanceOf(buyer1155, tokenId)).toString()).to.be.equal('5');
            expect((await erc20.balanceOf(seller1155)).toString()).to.be.equal('10000')
            expect((await erc20.balanceOf(marketOwner1155)).toString()).to.be.equal('100')
        });
    });
    describe('Should pass CANCELLED marketplace journeys', () => {
        it('cancel OK ERC721 listing for native asset from seller', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);
            const marketplace = await MarketplaceListing.new(200, marketOwner);

            const tokenId = new BN(1);
            await token.mintWithTokenURI(seller, tokenId, 'test.com');
            await token.approve(marketplace.address, tokenId, { from: seller });

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, ZERO_ADDRESS)

            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: ZERO_ADDRESS
            })

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');

            const b = await marketplace.cancelListing('1', { from: seller });
            listings = await marketplace.getListing('1');

            expect(listings[2]).to.be.equal('2');
            expect(await token.ownerOf(tokenId)).to.be.equal(seller);
            expectEvent(b, 'ListingCancelled')
        });
        it('cancel OK ERC721 listing for native asset from owner', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);

            const marketplace = await MarketplaceListing.new(200, marketOwner);

            const tokenId = new BN(1);
            await token.mintWithTokenURI(seller, tokenId, 'test.com');

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, ZERO_ADDRESS)

            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: ZERO_ADDRESS
            })
            await token.approve(marketplace.address, tokenId, { from: seller });

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');

            const b = await marketplace.cancelListing('1');
            listings = await marketplace.getListing('1');

            expect(listings[2]).to.be.equal('2');
            expect(await token.ownerOf(tokenId)).to.be.equal(seller);
            expectEvent(b, 'ListingCancelled')
        });
        it('cancel not OK ERC721 listing for native asset from buyer', async function () {
            const token = await Tatum721Mock.new(name, symbol, false);

            const marketplace = await MarketplaceListing.new(200, marketOwner);

            const tokenId = new BN(1);
            await token.mintWithTokenURI(seller, tokenId, 'test.com');

            const nftAddress = token.address;
            const c = await marketplace.createListing('1', true, nftAddress, tokenId, 10000, seller, 1, ZERO_ADDRESS)

            expectEvent(c, 'ListingCreated', {
                isErc721: true,
                nftAddress,
                tokenId,
                amount: new BN(1),
                price: new BN(10000),
                erc20Address: ZERO_ADDRESS
            })
            await token.approve(marketplace.address, tokenId, { from: seller });

            let listings = await marketplace.getListing('1');
            expect(listings[0]).to.be.equal('1');
            expect(listings[2]).to.be.equal('0');

            try {
                await marketplace.cancelListing('1', { from: buyer });
                fail('Should not pass')
            } catch (e) {
            }
        });
    });
});
