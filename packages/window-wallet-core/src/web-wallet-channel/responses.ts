// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';

export type ResponseDataType =
	| { type: 'connect'; session: string }
	| { type: 'sign-transaction'; bytes: string; signature: string }
	| {
			type: 'sign-and-execute-transaction';
			bytes: string;
			signature: string;
			digest: string;
			effects: string;
	  }
	| { type: 'sign-personal-message'; bytes: string; signature: string };

export const ResponseData = v.variant('type', [
	v.object({
		type: v.literal('connect'),
		session: v.string('`session` is required'),
	}),
	v.object({
		type: v.literal('sign-transaction'),
		bytes: v.string(),
		signature: v.string(),
	}),
	v.object({
		type: v.literal('sign-and-execute-transaction'),
		bytes: v.string(),
		signature: v.string(),
		digest: v.string(),
		effects: v.string(),
	}),
	v.object({
		type: v.literal('sign-personal-message'),
		bytes: v.string(),
		signature: v.string(),
	}),
]) as v.GenericSchema<ResponseDataType, ResponseDataType>;

export type ResponsePayloadType =
	| { type: 'reject'; reason?: string | undefined }
	| { type: 'resolve'; data: ResponseDataType };

export const ResponsePayload = v.variant('type', [
	v.object({
		type: v.literal('reject'),
		reason: v.optional(v.string('`reason` must be a string')),
	}),
	v.object({
		type: v.literal('resolve'),
		data: ResponseData,
	}),
]) as v.GenericSchema<ResponsePayloadType, ResponsePayloadType>;

export type ResponseType = {
	id: string;
	source: 'web-wallet-channel';
	payload: ResponsePayloadType;
	version: '1';
};

export const Response = v.object({
	id: v.pipe(v.string(), v.uuid()),
	source: v.literal('web-wallet-channel'),
	payload: ResponsePayload,
	version: v.literal('1'),
}) as v.GenericSchema<ResponseType, ResponseType>;

export type ResponseTypes = {
	[P in ResponseDataType as P['type']]: P;
};
