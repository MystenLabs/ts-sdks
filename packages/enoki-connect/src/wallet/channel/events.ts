// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferOutput } from 'valibot';
import { literal, object, optional, pipe, string, url, uuid, variant } from 'valibot';

export const EnokiConnectRequestData = variant('type', [
	object({
		type: literal('connect'),
	}),
	object({
		type: literal('sign-transaction'),
		data: string('`data` is required'),
		address: string('`address` is required'),
	}),
	object({
		type: literal('sign-personal-message'),
		bytes: string('`bytes` is required'),
		address: string('`address` is required'),
	}),
]);
export type EnokiConnectRequestData = InferOutput<typeof EnokiConnectRequestData>;

export const EnokiConnectRequest = object({
	id: pipe(string('`id` is required'), uuid()),
	origin: pipe(string(), url('`origin` must be a valid URL')),
	name: optional(string()),
	publicAppSlug: string('`publicAppSlug` is required'),
	payload: EnokiConnectRequestData,
});

export type EnokiConnectRequest = InferOutput<typeof EnokiConnectRequest>;

export const EnokiConnectResponseData = variant('type', [
	object({
		type: literal('connect'),
		address: string(),
		publicKey: string(),
	}),
	object({
		type: literal('sign-transaction'),
		bytes: string(),
		signature: string(),
	}),
	object({
		type: literal('sign-personal-message'),
		bytes: string(),
		signature: string(),
	}),
]);
export type EnokiConnectResponseData = InferOutput<typeof EnokiConnectResponseData>;

export const EnokiConnectResponsePayload = variant('type', [
	object({
		type: literal('reject'),
	}),
	object({
		type: literal('resolve'),
		data: EnokiConnectResponseData,
	}),
]);
export type EnokiConnectResponsePayload = InferOutput<typeof EnokiConnectResponsePayload>;

export const EnokiConnectResponse = object({
	id: pipe(string(), uuid()),
	source: literal('enoki-connect-channel'),
	payload: EnokiConnectResponsePayload,
});
export type EnokiConnectResponse = InferOutput<typeof EnokiConnectResponse>;

export type EnokiConnectRequestTypes = Record<string, any> & {
	[P in EnokiConnectRequestData as P['type']]: P;
};

export type EnokiConnectResponseTypes = {
	[P in EnokiConnectResponseData as P['type']]: P;
};
