// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from 'react';

export function useCopy() {
	const [copied, setCopied] = useState(false);

	const copy = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			// Reset after 2 seconds
			setTimeout(() => setCopied(false), 2000);
			return true;
		} catch (error) {
			console.error('Failed to copy text:', error);
			return false;
		}
	}, []);

	return { copy, copied };
}
