// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import React from "react";
import ReactDOM from "react-dom/client";
import "@radix-ui/themes/styles.css";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import App from "./App.tsx";
import { dAppKit } from "./dapp-kit.ts";
import { registerEnokiConnectWallets } from "@mysten/enoki-connect";

import "./styles.css";

const queryClient = new QueryClient();

registerEnokiConnectWallets({
  publicAppSlugs: [
    "demo-enoki-connect-f9v2kr7q",
    "demo-enoki-connect-f9v2kr7q-light",
  ],
  dappName: "Test Dapp",
}).catch(() => {});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme appearance="dark">
      <QueryClientProvider client={queryClient}>
        <DAppKitProvider dAppKit={dAppKit}>
          <App />
        </DAppKitProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>,
);
