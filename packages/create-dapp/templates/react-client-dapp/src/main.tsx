import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import App from "./App.tsx";
import { dAppKit } from "./dApp-kit.ts";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DAppKitProvider dAppKit={dAppKit}>
      <App />
    </DAppKitProvider>
  </React.StrictMode>,
);
