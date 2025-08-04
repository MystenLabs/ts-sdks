# Sui typescript codegen

⚠️ **Warning**: This package is currently in development and may have breaking changes.

## Setup

To use this package you will need to install it from npm:

```bash
pnpm install @mysten/codegen
```

Then create a `sui-codegen.config.ts` to define what packages you want to generate code for:

```ts
import type { SuiCodegenConfig } from './src/config.js';

const config: SuiCodegenConfig = {
	output: './src/generated',
	generateSummaries: true,
	prune: true,
	packages: [
		{
			package: '@your-scope/your-package',
			path: './move/your-package',
		},
	],
};

export default config;
```

The `package` field should be the MVR name for your move package. If you have not registered your
package on MVR yet, you can use the `@local-pkg` scope, and set up an override in your `SuiClient`
to resolve it to the correct address.

## Generating code

To generate code, you will first need to create `package_summaries` for your package. You can do
this by running the following command in the root of you move package:

```bash
sui move summary
```

this will create a new `package_summaries` directory (which can be added to `.gitignore`) for the
codegen tool to analyze when generating code for your package.

If you are having trouble with this command, ensure you are using the latest version of the sui cli
(version `1.51.1` or later).

Now that you have the `package_summaries` you can generate you typescript code, by running

```bash
pnpm sui-ts-codegen generate
```

or by adding something the following script to your package.json and running `pnpm codegen`

```json
{
	"scripts": {
		"codegen": "sui-ts-codegen generate"
	}
}
```

## Setting up SuiClient

If your package is registered on MVR, the generated code should work without additional
configuration. If you are using a `@local-pkg` name, you will need to configure your `SuiClient` to
resolver the package name correctly:

```ts
const client = new SuiClient({
	network: 'testnet',
	url: testnetRpcUrl,
	mvr: {
		overrides: {
			packages: {
				'@local-pkg/your-package': YOUR_PACKAGE_ID,
			},
		},
	},
});
```

If you are using `dapp-kit`, you may need to set up your network config and `SuiClientProvider`:

```ts
const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
	testnet: {
		url: getFullnodeUrl('testnet'),
		variables: {
			yourPackageId: YOUR_TESTNET_PACKAGE_ID,
		},
	},
});
```

```tsx
<SuiClientProvider
	networks={networkConfig}
	defaultNetwork="testnet"
	createClient={(network, config) => {
		return new SuiClient({
			network,
			url: config.url,
			mvr: {
				overrides: {
					packages: {
						'@local-pkg/your-package': config.variables.yourPackageId,
					},
				},
			},
		});
	}}
>
	<App />
</SuiClientProvider>
```

## Calling Move Functions

The generated code provides type-safe functions for calling Move functions. Here's how to use them:

### Creating Objects

To create new objects from your Move package, use the generated `create` function:

This example assumes a simple `counter` package based on the `create-dapp` template:

```tsx
import { Transaction } from '@mysten/sui/transactions';
import * as counter from './generated/counter/counter';

async function createCounter() {
	// create a new Transaction
	const tx = new Transaction();
	// Add a create call
	tx.add(counter.create());

	const { digest } = suiClient.signAndExecuteTransaction({
		transaction: tx,
		signer: keypair,
	});

	return digest;
}

async function incrementCount(id: string) {
	const tx = tx.add(
		counter.increment({
			// Arguments can be passed in by name as an object, or as an array of values
			arguments: {
				// Argument values can be js primitives, or use methods like tx.pure or tx.object, or results of other move calls
				counter: id,
			},
		}),
	);

	const { digest } = suiClient.signAndExecuteTransaction({
		transaction: tx,
		signer: keypair,
	});

	return digest;
}
```

## Parsing BCS Types

The generated code also provides BCS definitions for your Move types:

First, you will need to load the bcs data for your object, then parse it with your generated type:

```tsx
import * as counter from './generated/counter/counter';

async await function readCounter(id: string) {
	const data = suiClient.getObject({
		id,
		options: {
			// request the bcs data when loading your object
			showBcs: true,
		}
	})

	if (data.data.bcs?.dataType !== 'moveObject') {
	  throw new Error('Expected a move object')
	}

	return counter.Counter().fromBase64(data.data.bcs.bcsBytes)
}
```
