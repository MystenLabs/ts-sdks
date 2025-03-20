# MVR SDK

The mvr SDK is a TypeScript SDK for the Move Registry (mvr) which helps you generate a static file for MVR resolution.
This can be used to cache all MVR names for performance & security reasons, and used in the `NamedPackagesPlugin` in your project.

## Usage

### Generate a static file for MVR resolution

You can generate your static file by running the following command:

// TODO: Double-check how that will be callable.
```bash
pnpm dlx @mysten/mvr
```

Available options:

- `--directory <directory>`: The directory to run the command in (defaults to `.`)
- `--output <file-name>`: The output's file name (defaults to `mvr.ts`)
- `--depth <depth>`: The depth of recursive search for MVR names (defaults to `10`)
- `--url-mainnet <url>`: The URL to the mainnet MVR (defaults to `https://mainnet.mvr.mystenlabs.com`)
- `--url-testnet <url>`: The URL to the testnet MVR (defaults to `https://testnet.mvr.mystenlabs.com`)
- `--include <dir_patterns>`: The directory patterns to include in the search (defaults to `**/*.{js,ts,jsx,tsx,mjs,cjs}`)
- `--exclude <dir_patterns>`: The directory patterns to exclude in the search (defaults to `'node_modules/**', '**/.*'`)
- `--force`: Force overwrite the existing MVR file (useful in CI) (defaults to `false`)

### Use the static file in your project

Once you have your static file, you can use it in your project by importing it and passing it to the `NamedPackagesPlugin` in your project.

```ts
import { getMvrCache } from './mvr.ts';
import { NamedPackagesPlugin } from '@mysten/sui/src/transactions';

// create a cache for your network.
const cache = getMvrCache('mainnet');

const plugin = new NamedPackagesPlugin({
  // ...,
  overrides: cache,
});
```
