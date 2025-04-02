// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferOutput } from 'valibot';
import { array, literal, object, optional, pipe, string, url, uuid, variant } from 'valibot';

export const StashedRequestData = variant('type', [
	object({
		type: literal('connect'),
	}),
	object({
		type: literal('sign-transaction'),
		transaction: string('`transaction` is required'),
		address: string('`address` is required'),
		chain: string('`chain` is required'),
		session: string('`session` is required'),
	}),
	object({
		type: literal('sign-and-execute-transaction'),
		transaction: string('`transaction` is required'),
		address: string('`address` is required'),
		chain: string('`chain` is required'),
		session: string('`session` is required'),
	}),
	object({
		type: literal('sign-personal-message'),
		chain: optional(string('`chain` is required')),
		message: string('`message` is required'),
		address: string('`address` is required'),
		session: string('`session` is required'),
	}),
]);
export type StashedRequestData = InferOutput<typeof StashedRequestData>;

export const StashedRequest = object({
	version: literal('v1'),
	requestId: pipe(string('`requestId` is required'), uuid()),
	appOrigin: pipe(string(), url('`appOrigin` must be a valid URL')),
	appName: string('`appName` is required'),
	payload: StashedRequestData,
});

export type StashedRequest = InferOutput<typeof StashedRequest>;

export const StashedResponseData = variant('type', [
	object({
		type: literal('connect'),
		accounts: array(
			object({
				address: string('`address` is required'),
				publicKey: optional(string('`publicKey` must be a string')),
			}),
		),
		session: string('`session` is required'),
	}),
	object({
		type: literal('sign-transaction'),
		bytes: string(),
		signature: string(),
	}),
	object({
		type: literal('sign-and-execute-transaction'),
		bytes: string(),
		signature: string(),
		digest: string(),
		effects: optional(string()),
	}),
	object({
		type: literal('sign-personal-message'),
		bytes: string(),
		signature: string(),
	}),
]);
export type StashedResponseData = InferOutput<typeof StashedResponseData>;

export const StashedResponsePayload = variant('type', [
	object({
		type: literal('reject'),
	}),
	object({
		type: literal('resolve'),
		data: StashedResponseData,
	}),
]);
export type StashedResponsePayload = InferOutput<typeof StashedResponsePayload>;

export const StashedResponse = object({
	id: pipe(string(), uuid()),
	source: literal('zksend-channel'),
	payload: StashedResponsePayload,
});
export type StashedResponse = InferOutput<typeof StashedResponse>;

export type StashedRequestTypes = Record<string, any> & {
	[P in StashedRequestData as P['type']]: P;
};

export type StashedResponseTypes = {
	[P in StashedResponseData as P['type']]: P;
};
