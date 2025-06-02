// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export function chunk<T>(array: readonly T[], size: number): T[][] {
	return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => {
		return array.slice(i * size, (i + 1) * size);
	});
}
