// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';
import { bcs } from '@mysten/bcs';

type Vec<T> = Iterable<T> & { length: number };

export type ZkLoginSignatureInputs = {
	proofPoints: {
		a: Vec<string>;
		b: Vec<Vec<string>>;
		c: Vec<string>;
	};
	issBase64Details: {
		value: string;
		indexMod4: number;
	};
	headerBase64: string;
	addressSeed: string;
};

export type ZkLoginSignature = {
	inputs: ZkLoginSignatureInputs;
	maxEpoch: number | bigint | string;
	userSignature: Iterable<number>;
};

type ZkLoginSignatureOutput = {
	inputs: {
		proofPoints: { a: string[]; b: string[][]; c: string[] };
		issBase64Details: { value: string; indexMod4: number };
		headerBase64: string;
		addressSeed: string;
	};
	maxEpoch: string;
	userSignature: Uint8Array;
};

export const zkLoginSignature = bcs.struct('ZkLoginSignature', {
	inputs: bcs.struct('ZkLoginSignatureInputs', {
		proofPoints: bcs.struct('ZkLoginSignatureInputsProofPoints', {
			a: bcs.vector(bcs.string()),
			b: bcs.vector(bcs.vector(bcs.string())),
			c: bcs.vector(bcs.string()),
		}),
		issBase64Details: bcs.struct('ZkLoginSignatureInputsClaim', {
			value: bcs.string(),
			indexMod4: bcs.u8(),
		}),
		headerBase64: bcs.string(),
		addressSeed: bcs.string(),
	}),
	maxEpoch: bcs.u64(),
	userSignature: bcs.byteVector(),
}) as BcsType<ZkLoginSignatureOutput, ZkLoginSignature>;
