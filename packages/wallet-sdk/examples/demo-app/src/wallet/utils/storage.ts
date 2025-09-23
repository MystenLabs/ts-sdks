// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

const STORAGE_KEY_PREFIX = 'demo-wallet:';

function getStorageKey(key: string): string {
	return `${STORAGE_KEY_PREFIX}${key}`;
}

export function saveToStorage(key: string, value: string): void {
	localStorage.setItem(getStorageKey(key), value);
}

export function loadFromStorage(key: string): string | null {
	return localStorage.getItem(getStorageKey(key));
}
