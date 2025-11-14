import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import {
  DEVNET_COUNTER_PACKAGE_ID,
  TESTNET_COUNTER_PACKAGE_ID,
  MAINNET_COUNTER_PACKAGE_ID,
} from "./constants.ts";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getJsonRpcFullnodeUrl("devnet"),
      network: "devnet",
      variables: {
        counterPackageId: DEVNET_COUNTER_PACKAGE_ID,
      },
    },
    testnet: {
      url: getJsonRpcFullnodeUrl("testnet"),
      network: "testnet",
      variables: {
        counterPackageId: TESTNET_COUNTER_PACKAGE_ID,
      },
    },
    mainnet: {
      url: getJsonRpcFullnodeUrl("mainnet"),
      network: "mainnet",
      variables: {
        counterPackageId: MAINNET_COUNTER_PACKAGE_ID,
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
