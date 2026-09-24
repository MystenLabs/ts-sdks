// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Request header carrying the highest protocol version whose types the client can decode. */
export const CLIENT_PROTOCOL_VERSION_HEADER = 'x-sui-client-protocol-version';

/**
 * Highest Sui protocol version whose on-chain types this SDK can decode. Bump this when the SDK
 * gains support for types introduced in a newer protocol version.
 */
export const MAX_PROTOCOL_VERSION = 138;
