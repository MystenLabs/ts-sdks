// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { base58 } from '@scure/base';

export const toBase58 = (buffer: Uint8Array): string => base58.encode(buffer);
export const fromBase58 = (str: string): Uint8Array<ArrayBuffer> =>
	base58.decode(str) as Uint8Array<ArrayBuffer>;
