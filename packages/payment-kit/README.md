# `@mysten/payment-kit`

> ⚠️ **Warning** - This package is in active development. APIs are experimental and subject to
> breaking changes without notice. We recommend thoroughly testing any implementation before using
> in production environments.

## Installation

```bash
npm install --save @mysten/payment-kit @mysten/sui
```

## Setup

In order to use the Payment Kit SDK you will first need to create an instance of SuiClient from the
Typescript SDK, and a client instance of the Payment Kit SDK.

```ts
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { PaymentKitClient } from '@mysten/payment-kit';

const suiClient = new SuiClient({
	url: getFullnodeUrl('testnet'), // Testnet and Mainnet are supported
});

const paymentKitClient = new PaymentKitClient({
	suiClient,
});
```

The Payment Kit SDK already includes all relevant package and object IDs to operate against
`mainnet` and `testnet`. No other environments are currently supported. By default, all registry
based payments are routed through a default payment registry, but more on that later.

## SDK Overview

The Payment Kit SDK is designed to allow for direct interactions with the
[sui-payment-kit](https://github.com/MystenLabs/sui-payment-kit) Move Package. This includes:

- Processing payments
- Creating and managing `PaymentRegistry` instances
- Claiming `PaymentRecord` storage fees
- Querying the state of a `PaymentRecord`
- Constructing relevant Object IDs

These operations are exposed via a `PaymentKitClient` which provides relevant APIs so an application
doesn't need to know how payments are processed, receipts are created and registry configurations
are stored.

### Payment Processing

There are two distinct ways in which payments are processed. Registry based payments and Ephemeral
payments.

#### Registry Processed Payments

When using a `PaymentRegistry` to process a payment a registry must always be specified. A registry
has the ability to specify where funds must be sent and how long a `PaymentRecord` can live before
being eligible for deletion. In addition to registry configurations, a `PaymentRecord` is always
created when using a registry to process a payment. A `PaymentRecord` enforces that a payment
request cannot be fulfilled more than once. The existence of a `PaymentRecord` also guarantees that
a payment has been made. Once a payment has been fulfilled a `PaymentReceipt` is emitted that can be
used as you please.

#### Ephemeral Payments

Unlike Registry processed payments, an ephemeral payment does not leverage a registry and does not
write a `PaymentRecord`. This means a payment request can be fulfilled more than once and there is
no way to guarantee a payment has been made, outside of a transaction digest. Although, a
`PaymentReceipt` is still emitted once completed, similar to registry based payments.

### Payment Registries

At the core of Payment Kit is the `PaymentRegistry`. Currently, a registry is used to process
one-time payments, manage where funds are sent and specify the expiration of a `PaymentRecord`.
Although a `PaymentRegistry` can eventually be expanded upon to support additional customization and
functionality via configurations. While there is a default registry to leverage, entities are
encouraged to create and manage their own registries. Registries are created via personalized name.
This name is then used to Derived an Object ID. This means registry names must be unique.

```rust
public struct PaymentRegistry has key {
    id: UID,
    cap_id: ID,
    config: VecMap<String, Value>,
    version: u16,
}
```

#### Registry Configuration

Configurations are exclusive to a `PaymentRegistry`. There are currently two configurations offered:

1. Receipt Epoch Expiration: The number of epochs that must elapse before a `PaymentReceipt` is
   eligible to be deleted. This is a permissionless operation and anyone can reclaim the storage
   fees.

2. Registry Managed Funds: A configuration that specifies if payment funds must be sent to the
   registry itself. If a `PaymentRegistry` has set this configuration, the `receiver` must be the
   registry itself. Funds can later be claimed by the registry admin.

### Payment Records

As mentioned above, a `PaymentRecord` is only written when using a registry to process a payment.
This payment record is used to guarantee a payment has been made. But note records can be deleted
based on a registries epoch expiration duration (the default expiration is 30 epochs after
creation).

```rust
public struct PaymentRecord has copy, drop, store {
    epoch_at_time_of_record: u64,
}
```

#### Payment Keys

A `PaymentRecord` is a Dynamic Field owned by the `PaymentRegistry`. This record is derived via a
`PaymentKey`. A `PaymentKey` is a hash of request payment. This includes the `PaymentID`,
`PaymentAmount`, `CoinType`, and `ReceiverAddress`.

```rust
public struct PaymentKey<phantom T> has copy, drop, store {
    nonce: String,
    payment_amount: u64,
    receiver: address,
}
```

### Payment Receipts

When processing an ephemeral, or registry based, payment a `PaymentReceipt` is always emitted and
returned. This payment receipt can be stored, off-chain, for whateve purpose it may serve to your
application.

```ts
type PaymentReceipt = {
	paymentType: PaymentType;
	paymentId: string;
	amount: number;
	receiver: string;
	coinType: string;
	timestampMs: number;
};
```
