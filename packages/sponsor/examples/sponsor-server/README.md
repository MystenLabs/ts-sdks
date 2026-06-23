# Sponsor server example

This example runs a small Hono server that sponsors and executes user-signed transactions only when
they call a configured Move function.

The server keeps the default sponsor validators, verifies the user signature, caps the gas budget,
and requires the transaction to contain exactly one command: a `MoveCall` to `ALLOWED_TARGET`.

## Run

```sh
SPONSOR_KEY=<sponsor-secret-key> \
ALLOWED_TARGET=0x...::module::function \
pnpm --filter @mysten-incubation/sponsor dev:sponsor-server
```

Optional environment variables:

- `FULLNODE_URL`: Sui gRPC fullnode URL. Defaults to Testnet.
- `MAX_GAS_BUDGET`: Maximum sponsored gas budget in MIST. Defaults to `50000000`.
- `PORT`: Server port. Defaults to `3000`.

## Request

The client fetches the sponsor address from `/config`, builds a transaction with that address as gas
owner and address-balance gas, signs those bytes, then sends the base64 transaction, signature, and
optional execution `include` fields to the server. `effects` are always included in the response,
even if omitted from `include`.

```ts
import { toBase64 } from '@mysten/sui/utils';

const config = await fetch('http://127.0.0.1:3000/config').then(
	(response) => response.json() as Promise<{ sponsor: string }>,
);

transaction.setSender(userAddress);
transaction.setGasOwner(config.sponsor);
transaction.setGasPayment([]);

const bytes = await transaction.build({ client });
const { signature } = await userSigner.signTransaction(bytes);

const response = await fetch('http://127.0.0.1:3000/v1/sponsor', {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({
		transaction: toBase64(bytes),
		userSignature: signature,
		include: {
			events: true,
			balanceChanges: true,
		},
	}),
});
```
