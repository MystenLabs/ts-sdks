import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  DEVNET_COUNTER_PACKAGE_ID,
  TESTNET_COUNTER_PACKAGE_ID,
  MAINNET_COUNTER_PACKAGE_ID,
} from "./constants.ts";

const GRPC_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

// MVR overrides per network - map local package names to deployed addresses
const MVR_OVERRIDES = {
  mainnet: MAINNET_COUNTER_PACKAGE_ID && {
    packages: {
      "@local-pkg/counter": MAINNET_COUNTER_PACKAGE_ID,
    },
  },
  testnet: TESTNET_COUNTER_PACKAGE_ID && {
    packages: { "@local-pkg/counter": TESTNET_COUNTER_PACKAGE_ID },
  },
  devnet: DEVNET_COUNTER_PACKAGE_ID && {
    packages: { "@local-pkg/counter": DEVNET_COUNTER_PACKAGE_ID },
  },
} as const;

export const dAppKit = createDAppKit({
  enableBurnerWallet: import.meta.env.DEV,
  networks: ["mainnet", "testnet", "devnet"],
  defaultNetwork: "testnet",
  createClient(network) {
    return new SuiGrpcClient({
      network,
      baseUrl: GRPC_URLS[network],
      mvr: MVR_OVERRIDES[network] ? { overrides: MVR_OVERRIDES[network] } : {},
    });
  },
});

// global type registration necessary for the hooks to work correctly
declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
