// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CSSResult } from 'lit';
import { resetStyles } from './reset.js';
import { themeStyles } from './theme.js';

export const sharedStyles: CSSResult[] = [themeStyles, resetStyles];
