// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';

/**
 * Custom hook for localStorage persistence with TypeScript support
 */
export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
	serializer: {
		serialize: (value: T) => string;
		deserialize: (value: string) => T;
	} = {
		serialize: JSON.stringify,
		deserialize: JSON.parse,
	},
): [T, (value: T | ((prev: T) => T)) => void] {
	// Initialize state with value from localStorage or default
	const [state, setState] = useState<T>(() => {
		if (typeof localStorage === 'undefined') {
			return defaultValue;
		}

		try {
			const item = localStorage.getItem(key);
			if (item === null) {
				return defaultValue;
			}
			return serializer.deserialize(item);
		} catch (error) {
			console.warn(`Failed to read localStorage key "${key}":`, error);
			return defaultValue;
		}
	});

	// Update localStorage when state changes
	useEffect(() => {
		if (typeof localStorage === 'undefined') {
			return;
		}

		try {
			localStorage.setItem(key, serializer.serialize(state));
		} catch (error) {
			console.warn(`Failed to write to localStorage key "${key}":`, error);
		}
	}, [key, state, serializer]);

	return [state, setState];
}

/**
 * Simplified hook for string values
 */
export function useLocalStorageString(key: string, defaultValue = '') {
	return useLocalStorage(key, defaultValue, {
		serialize: (value: string) => value,
		deserialize: (value: string) => value,
	});
}

/**
 * Simplified hook for boolean values
 */
export function useLocalStorageBoolean(key: string, defaultValue = false) {
	return useLocalStorage(key, defaultValue, {
		serialize: (value: boolean) => String(value),
		deserialize: (value: string) => value === 'true',
	});
}
