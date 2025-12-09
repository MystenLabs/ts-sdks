import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";

const GRPC_URLS = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

export const dAppKit = createDAppKit({
  enableBurnerWallet: import.meta.env.DEV,
  networks: ["mainnet", "testnet", "devnet"],
  defaultNetwork: "testnet",
  createClient(network) {
    return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
  },
});

// global type registration necessary for the hooks to work correctly
declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}
