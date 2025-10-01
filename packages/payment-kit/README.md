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

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(PaymentKitClient.asClientExtension());
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
write a `PaymentRecord`. This means duplicate payments are not implicitly prevented. Although, a
`PaymentReceipt` is still emitted once completed, similar to registry based payments.

### Payment Registries

At the core of Payment Kit is the `PaymentRegistry`. Currently, a registry is used to process
one-time payments, manage how funds are collected and specify the expiration of a `PaymentRecord`.
While there is a default registry to leverage, entities are encouraged to create and manage their
own registries. This enables easier indexing of relevant payments and reduces the potential for
object congestion. Registries are created via personalized name. This name is then used to derive an
Object ID. This means registry names must be unique.

#### Registry Configuration

Configurations are applied to an instance of a `PaymentRegistry`. There are currently two
configurations offered:

1. Receipt Epoch Expiration: The number of epochs that must elapse before a `PaymentReceipt` is
   eligible to be deleted. Deleting expired receipts is a permissionless operation that anyone can
   perform and will result in a small storage rebate for each deleted record, incentivizing
   automatic cleanup up of registries.

2. Registry Managed Funds: A configuration that specifies if payment funds must be sent to the
   registry itself. If a `PaymentRegistry` has set this configuration, the `receiver` must be the
   registry itself. Funds can later be claimed by the registry admin. An added benefit to this
   configuration is avoiding complicated coin merging, when dealing with high thoroughput payments.
   This is because the destination is always the same coin object when the registry is set as the
   fund manager.

### Payment Records

As mentioned above, a `PaymentRecord` is only written when using a registry to process a payment.
This payment record is used to guarantee a payment has been made. But note records can be deleted
based on a registries epoch expiration duration (the default expiration is 30 epochs after
creation).

#### Payment Keys

A `PaymentRecord` is a Dynamic Field owned by the `PaymentRegistry`. This record is derived via a
`PaymentKey`. A `PaymentKey` is a hash of request payment. This includes the `PaymentID`,
`PaymentAmount`, `CoinType`, and `ReceiverAddress`.

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
