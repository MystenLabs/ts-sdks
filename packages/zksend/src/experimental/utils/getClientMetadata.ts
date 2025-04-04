// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
export default function getClientMetadata() {
	return {
		version: 'v1',
		originUrl: window.location.href,
		userAgent: navigator.userAgent,
		screenResolution: `${window.screen.width}x${window.screen.height}`,
		language: navigator.language,
		platform: navigator.platform,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timestamp: Date.now(),
	};
}
