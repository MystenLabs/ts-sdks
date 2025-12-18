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
import { bcs, compareBcsBytes } from './bcs.js';
import { BcsReader } from './reader.js';
import type {
	Encoding,
	EnumInputShape,
	EnumOutputShape,
	EnumOutputShapeWithKeys,
	InferBcsInput,
	InferBcsType,
	JoinString,
} from './types.js';
import { decodeStr, encodeStr, splitGenericParameters } from './utils.js';
import type { BcsWriterOptions } from './writer.js';
import { BcsWriter } from './writer.js';

// Re-export all encoding dependencies.
export {
	bcs,
	BcsEnum,
	BcsReader,
	BcsStruct,
	BcsTuple,
	BcsType,
	BcsWriter,
	compareBcsBytes,
	decodeStr,
	encodeStr,
	fromBase58,
	fromBase64,
	fromHex,
	isSerializedBcs,
	SerializedBcs,
	splitGenericParameters,
	toBase58,
	toBase64,
	toHex,
	type BcsTypeOptions,
	type BcsWriterOptions,
	type Encoding,
	type EnumInputShape,
	type EnumOutputShape,
	type EnumOutputShapeWithKeys,
	type InferBcsInput,
	type InferBcsType,
	type JoinString,
};
