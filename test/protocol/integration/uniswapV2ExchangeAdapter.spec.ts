import "module-alias/register";

import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";

import { Address, Bytes } from "@utils/types";
import { Account } from "@utils/test/types";
import {
  ADDRESS_ZERO,
  EMPTY_BYTES,
  ZERO,
} from "@utils/constants";
import { UniswapV2ExchangeAdapter } from "@utils/contracts";
import DeployHelper from "@utils/deploys";
import {
  ether,
} from "@utils/index";
import {
  addSnapshotBeforeRestoreAfterEach,
  getAccounts,
  getSystemFixture,
  getUniswapFixture,
  getWaffleExpect,
} from "@utils/test/index";

import { SystemFixture, UniswapFixture } from "@utils/fixtures";

const expect = getWaffleExpect();

describe.only("UniswapV2ExchangeAdapter", () => {
  let owner: Account;
  let mockSetToken: Account;
  let deployer: DeployHelper;
  let setup: SystemFixture;
  let uniswapSetup: UniswapFixture;

  let uniswapV2ExchangeAdapter: UniswapV2ExchangeAdapter;

  before(async () => {
    [
      owner,
      mockSetToken,
    ] = await getAccounts();

    deployer = new DeployHelper(owner.wallet);
    setup = getSystemFixture(owner.address);
    await setup.initialize();

    uniswapSetup = getUniswapFixture(owner.address);
    await uniswapSetup.initialize(
      owner,
      setup.weth.address,
      setup.wbtc.address,
      setup.dai.address
    );

    uniswapV2ExchangeAdapter = await deployer.adapters.deployUniswapV2ExchangeAdapter(uniswapSetup.router.address);
  });

  addSnapshotBeforeRestoreAfterEach();

  describe("constructor", async () => {
    let subjectUniswapRouter: Address;

    beforeEach(async () => {
      subjectUniswapRouter = uniswapSetup.router.address;
    });

    async function subject(): Promise<any> {
      return await deployer.adapters.deployUniswapV2ExchangeAdapter(subjectUniswapRouter);
    }

    it("should have the correct router address", async () => {
      const deployedUniswapV2ExchangeAdapter = await subject();

      const actualRouterAddress = await deployedUniswapV2ExchangeAdapter.router();
      expect(actualRouterAddress).to.eq(uniswapSetup.router.address);
    });
  });

  describe("getSpender", async () => {
    async function subject(): Promise<any> {
      return await uniswapV2ExchangeAdapter.getSpender();
    }

    it("should return the correct spender address", async () => {
      const spender = await subject();

      expect(spender).to.eq(uniswapSetup.router.address);
    });
  });

  describe("getTradeCalldata", async () => {
    let sourceAddress: Address;
    let destinationAddress: Address;
    let sourceQuantity: BigNumber;
    let destinationQuantity: BigNumber;

    let subjectMockSetToken: Address;
    let subjectSourceToken: Address;
    let subjectDestinationToken: Address;
    let subjectSourceQuantity: BigNumber;
    let subjectMinDestinationQuantity: BigNumber;
    let subjectData: Bytes;

    beforeEach(async () => {
      sourceAddress = setup.wbtc.address;          // WBTC Address
      sourceQuantity = BigNumber.from(100000000);   // Trade 1 WBTC
      destinationAddress = setup.weth.address;     // WETH Address
      destinationQuantity = ether(33);             // Receive at least 33 ETH

      subjectSourceToken = sourceAddress;
      subjectDestinationToken = destinationAddress;
      subjectMockSetToken = mockSetToken.address;
      subjectSourceQuantity = sourceQuantity;
      subjectMinDestinationQuantity = destinationQuantity;
      subjectData = EMPTY_BYTES;
    });

    async function subject(): Promise<any> {
      return await uniswapV2ExchangeAdapter.getTradeCalldata(
        subjectSourceToken,
        subjectDestinationToken,
        subjectMockSetToken,
        subjectSourceQuantity,
        subjectMinDestinationQuantity,
        subjectData,
      );
    }

    it("should return the correct trade calldata", async () => {
      const calldata = await subject();
      const expectedCallData = uniswapSetup.router.interface.encodeFunctionData("swapExactTokensForTokens", [
        sourceAddress,
        sourceQuantity,
        destinationAddress,
        mockSetToken.address,
        ethers.constants.MaxUint256,
        ADDRESS_ZERO,
      ]);
      expect(JSON.stringify(calldata)).to.eq(JSON.stringify([uniswapSetup.router.address, ZERO, expectedCallData]));
    });
  });
});
