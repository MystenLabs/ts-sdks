// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class PaymentKitClientError extends Error {}

/** Thrown when the client could not find a requested coin object */
export class RequestedCoinObjectNotFound extends PaymentKitClientError {}
