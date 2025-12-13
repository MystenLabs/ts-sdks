import type { SuiCodegenConfig } from "@mysten/codegen";

const config: SuiCodegenConfig = {
  output: "./src/contracts",
  packages: [
    {
      package: "@local-pkg/counter",
      path: "./move/counter",
    },
  ],
};

export default config;
