# @mysten/grpc-node-transport

A native gRPC (HTTP/2) transport for `SuiGrpcClient` from `@mysten/sui/grpc`, built on
[`@grpc/grpc-js`](https://www.npmjs.com/package/@grpc/grpc-js). Node.js only.

Without `interceptors`, ledger streams read messages only as your loop asks for them, as on the
default gRPC-web transport; with `interceptors`, messages are read as they arrive. Compared with
gRPC-web, it also:

- runs every call over one HTTP/2 connection,
- sends keepalive pings while calls are open, so a long-lived stream notices a dead connection,
- connects to nodes that serve gRPC without a gRPC-web proxy.

## Installation

```bash
npm install @mysten/grpc-node-transport @mysten/sui
```

## Usage

```typescript
import { GrpcNodeTransport } from '@mysten/grpc-node-transport';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const transport = new GrpcNodeTransport({ baseUrl: 'https://fullnode.mainnet.sui.io:443' });
const client = new SuiGrpcClient({ network: 'mainnet', transport });

for await (const result of client.streamCheckpoints()) {
	console.log(result.checkpoint.sequenceNumber);
}

// Release the HTTP/2 connection when done.
transport.close();
```

`https://` URLs connect with TLS and `http://` URLs without. Pass `channelCredentials` to use other
credentials and `clientOptions` for `@grpc/grpc-js` channel options.

See the
[gRPC client documentation](https://sdk.mystenlabs.com/sui/clients/grpc#native-grpc-transport) for
all options.
