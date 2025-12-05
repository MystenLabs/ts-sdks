import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getJsonRpcFullnodeUrl("devnet"),
      network: "devnet",
    },
    testnet: {
      url: getJsonRpcFullnodeUrl("testnet"),
      network: "testnet",
    },
    mainnet: {
      url: getJsonRpcFullnodeUrl("mainnet"),
      network: "mainnet",
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
