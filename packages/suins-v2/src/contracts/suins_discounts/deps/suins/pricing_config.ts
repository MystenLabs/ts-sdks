// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveTuple } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = 'suins::pricing_config';
export const Range = new MoveTuple(`${$moduleName}::Range`, [bcs.u64(), bcs.u64()]);
