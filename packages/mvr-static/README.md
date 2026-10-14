# mvr-static

The mvr-static tool is a typescript CLI tool to generate a static file for Move Registry (mvr)
resolution. This can be used to cache all MVR names for performance & security reasons, and used
with the Sui client's built-in MVR support.

## Usage

### Generate a static file for MVR resolution

You can generate your static file by running the following command:

```bash
pnpm dlx @mysten/mvr-static
```

Available options:

- `--directory <directory>`: The directory to run the command in (defaults to `.`)
- `--output <file-name>`: The output's file name (defaults to `mvr.ts`)
- `--depth <depth>`: The depth of recursive search for MVR names (defaults to `10`)
- `--url-mainnet <url>`: The URL to the mainnet MVR (defaults to
  `https://mainnet.mvr.mystenlabs.com`)
- `--url-testnet <url>`: The URL to the testnet MVR (defaults to
  `https://testnet.mvr.mystenlabs.com`)
- `--include <dir_patterns>`: The directory patterns to include in the search (defaults to
  `**/*.{js,ts,jsx,tsx,mjs,cjs,mts,cts}`)
- `--exclude <dir_patterns>`: The directory patterns to exclude in the search (defaults to
  `'node_modules/**', '**/.*'`)
- `--force`: Force overwrite the existing MVR file (useful in CI) (defaults to `false`)

### Use the static file in your project

Once you have your static file, you can use it in your project by importing it and passing it to the
Sui client initialization. MVR resolution is now built into the core client.

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { getMvrCache } from './mvr.ts';

// Create a gRPC client with MVR overrides for your network
const client = new SuiGrpcClient({
	network: 'mainnet',
	baseUrl: 'https://fullnode.mainnet.sui.io:443',
	mvr: {
		overrides: getMvrCache('mainnet'),
	},
});
```

The client will now use your pre-resolved MVR names instead of making API calls, which improves
performance and security.

## Static extraction

The scanner retains its content-wide MVR pattern matching and also resolves bounded, same-file local
constant strings. Supported constant forms include string and template literals, template
interpolation, string `+` concatenation, references to local `const` declarations (including
transitive and forward references), parentheses, and transparent TypeScript wrappers such as
`as const`, non-null assertions, type assertions, and `satisfies`. Local references respect lexical
scope and shadowing.

The scanner does not execute code or resolve imports. Imported values, helper or other function
calls, mutable bindings, parameters, member access, and other dynamic expressions remain
unsupported. AST parsing and evaluation use file-size, concurrency, and work limits; files that
cannot be parsed or exceed those limits still use the original content-wide matching.
