// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAnalyzer } from '../analyzer.js';
import { addressAliasChanges } from './address-alias.js';

/**
 * Safety checks that apply to every transaction a wallet approves:
 *
 * - {@link addressAliasChanges}: the transaction must not change address aliases.
 *
 * Each check reports problems as issues, so any analyzer that depends on
 * `defaultRules` gets those issues too, and its status is `partial` instead of
 * `success`. `autoApprovalAnalyzer` depends on it. Add it to your own `analyze()`
 * call, or as a dependency, to run the same checks. Each check documents the
 * option that turns it off.
 */
export const defaultRules = createAnalyzer({
	dependencies: { addressAliasChanges },
	analyze: () => () => ({ result: null }),
});
