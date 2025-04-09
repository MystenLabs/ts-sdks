// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as v from 'valibot';

export type JsonData = string | number | boolean | null | { [key: string]: JsonData } | JsonData[];

const JsonSchema: v.GenericSchema<JsonData> = v.lazy(() =>
	v.union([
		v.string(),
		v.number(),
		v.boolean(),
		v.null(),
		v.record(v.string(), JsonSchema),
		v.array(JsonSchema),
	]),
);

export const RequestData = v.variant('type', [
	v.object({
		type: v.literal('connect'),
		chain: v.string('`chain` is required'),
	}),
	v.object({
		type: v.literal('sign-transaction'),
		transaction: v.string('`transaction` is required'),
		address: v.string('`address` is required'),
		chain: v.string('`chain` is required'),
		session: v.string('`session` is required'),
	}),
	v.object({
		type: v.literal('sign-and-execute-transaction'),
		transaction: v.string('`transaction` is required'),
		address: v.string('`address` is required'),
		chain: v.string('`chain` is required'),
		session: v.string('`session` is required'),
	}),
	v.object({
		type: v.literal('sign-personal-message'),
		chain: v.string('`chain` is required'),
		message: v.string('`message` is required'),
		address: v.string('`address` is required'),
		session: v.string('`session` is required'),
	}),
]);
export type RequestDataType = v.InferOutput<typeof RequestData>;

export const Request = v.object({
	version: v.literal('v1'),
	requestId: v.pipe(v.string('`requestId` is required'), v.uuid()),
	appUrl: v.pipe(v.string(), v.url('`appUrl` must be a valid URL')),
	appName: v.string('`appName` is required'),
	payload: RequestData,
	metadata: v.optional(v.record(v.string(), JsonSchema)),
	extraRequestOptions: v.optional(v.record(v.string(), JsonSchema)),
});
export type RequestType = v.InferOutput<typeof Request>;
