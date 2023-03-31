import {Web3Function, Web3FunctionContext} from "@gelatonetwork/web3-functions-sdk";
import {Contract} from "ethers";

import priceFeed from "../../../src/priceFeed.json";
import sdk from "redstone-sdk";


// eslint-disable-next-line @typescript-eslint/no-var-requires


Web3Function.onRun(async (context: Web3FunctionContext) => {
  const {userArgs, gelatoArgs, provider} = context;

  const ORACLE_ABI = [
    "function cronCall(bytes) external",
    "function updateTime() public view returns(uint256)",

  ];
  const oracleAddress =
    (userArgs.oracle as string) ?? "0x33107Ff5a765B6472A0943eA5975FdB3E5b2CCC6";
  let contract;
  let updateTime;


  try {
    contract = new Contract(oracleAddress, ORACLE_ABI, provider);
    updateTime = parseInt(await contract.updateTime());


  } catch (err) {
    return {canExec: false, message: err};
  }


  // Check if it's ready for a new update
  const nextUpdateTime = updateTime + 3600 * 24; // every 24h
  const timestamp = gelatoArgs.blockTime;
  console.log(`Next  update: ${nextUpdateTime}  Current time: ${timestamp} Update time: ${updateTime}`);
  if (timestamp < nextUpdateTime) {
    return {canExec: false, message: `Time not elapsed`};
  }


  const unsignedMetadata = "manual-payload";
  const dataFeeds = [];
  priceFeed['items'].forEach((item) => {
    dataFeeds.push(item.symbol);
  })
  let redstonePayload = "0x"
  try {
    redstonePayload = await sdk.requestRedstonePayload(
      {
        dataServiceId: "redstone-main-demo",
        uniqueSignersCount: 1,
        dataFeeds: dataFeeds,
      },
      ["https://d33trozg86ya9x.cloudfront.net"],
      unsignedMetadata
    );
    redstonePayload = `0x${redstonePayload}`;
  } catch (err) {
    return {canExec: false, message: `redstonePayload call failed`};
  }
  console.log(`Update calldata && founds distribution`);

  // Return execution call data
  return {
    canExec: true,
    callData: contract.interface.encodeFunctionData("cronCall",
      [redstonePayload]),
  };
});