// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useEffect, useState } from 'react';

declare global {
	interface Window {
		Kapa?: {
			open: (query?: string) => void;
			close: () => void;
		};
	}
}

const OPEN_CLASS = 'kapa-sidebar-open';

export function KapaSidebar() {
	useEffect(() => {
		let kapaOpen = false;
		let hookedRef: ((query?: string) => void) | null = null;

		function syncClass() {
			document.documentElement.classList.toggle(OPEN_CLASS, kapaOpen);
		}

		function hookKapa() {
			if (!window.Kapa || !window.Kapa.open || window.Kapa.open === hookedRef) return;

			const origOpen = window.Kapa.open;
			const origClose = window.Kapa.close;

			window.Kapa.open = function (...args: Parameters<typeof origOpen>) {
				kapaOpen = true;
				syncClass();
				return origOpen.apply(this, args);
			};

			window.Kapa.close = function (...args: Parameters<typeof origClose>) {
				kapaOpen = false;
				syncClass();
				return origClose.apply(this, args);
			};

			hookedRef = window.Kapa.open;
		}

		function isSidebarVisible() {
			const x = window.innerWidth - 50;
			const y = window.innerHeight / 2;
			const el = document.elementFromPoint(x, y);
			if (!el) return false;
			if (el === document.body || el === document.documentElement) return false;
			const root = document.getElementById('nd-docs-layout') || document.querySelector('main');
			if (root && root.contains(el)) return false;
			return true;
		}

		const interval = setInterval(() => {
			hookKapa();
			const visible = isSidebarVisible();
			if (visible && !kapaOpen) {
				kapaOpen = true;
			} else if (!visible && kapaOpen) {
				kapaOpen = false;
			}
			syncClass();
		}, 300);

		return () => clearInterval(interval);
	}, []);

	return null;
}

export function KapaButton() {
	return (
		<button type="button" onClick={() => window.Kapa?.open()} className="kapa-floating-btn">
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M8 15h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z" />
				<path d="M9 18h6" />
				<path d="M10 22h4" />
				<path d="M10 18v4" />
				<path d="M14 18v4" />
			</svg>
			<span>Ask SDK AI</span>
		</button>
	);
}
