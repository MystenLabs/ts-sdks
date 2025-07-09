// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*
 * BCS implementation {@see https://github.com/diem/bcs } for JavaScript.
 * Intended to be used for Move applications; supports both NodeJS and browser.
 *
 * For more details and examples {@see README.md }.
 *
 * @module bcs
 * @property {BcsReader}
 */

import { toBase58, fromBase58, toBase64, fromBase64, toHex, fromHex } from '@mysten/utils';
import type { BcsTypeOptions } from './bcs-type.js';
import {
	BcsType,
	BcsStruct,
	BcsEnum,
	BcsTuple,
	isSerializedBcs,
	SerializedBcs,
} from './bcs-type.js';
import { bcs } from './bcs.js';
import { BcsReader } from './reader.js';
import type {
	EnumInputShape,
	EnumOutputShape,
	EnumOutputShapeWithKeys,
	InferBcsInput,
	InferBcsType,
} from './types.js';
import { decodeStr, encodeStr, splitGenericParameters } from './utils.js';
import type { BcsWriterOptions } from './writer.js';
import { BcsWriter } from './writer.js';

// Re-export all encoding dependencies.
export {
	bcs,
	BcsType,
	BcsStruct,
	BcsEnum,
	BcsTuple,
	type BcsTypeOptions,
	SerializedBcs,
	isSerializedBcs,
	toBase58,
	fromBase58,
	toBase64,
	fromBase64,
	toHex,
	fromHex,
	encodeStr,
	decodeStr,
	splitGenericParameters,
	BcsReader,
	BcsWriter,
	type BcsWriterOptions,
	type InferBcsInput,
	type InferBcsType,
	type EnumOutputShape,
	type EnumInputShape,
	type EnumOutputShapeWithKeys,
};

/** @deprecated use toBase58 instead */
export const toB58 = toBase58;

/** @deprecated use fromBase58 instead */
export const fromB58 = fromBase58;

/** @deprecated use toBase64 instead */
export const toB64 = toBase64;

/** @deprecated use fromBase64 instead */
export const fromB64 = fromBase64;

/** @deprecated use toHex instead */
export const toHEX = toHex;

/** @deprecated use fromHex instead */
export const fromHEX = fromHex;
