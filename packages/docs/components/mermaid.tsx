// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

'use client';

import { useEffect, useId, useRef, useState } from 'react';

export function Mermaid({ chart }: { chart: string }) {
	const id = useId().replace(/:/g, '-');
	const containerRef = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState<string>('');

	useEffect(() => {
		let cancelled = false;

		async function render() {
			const mermaid = (await import('mermaid')).default;
			mermaid.initialize({
				startOnLoad: false,
				theme: 'dark',
				themeVariables: {
					darkMode: true,
					background: '#0d0d14',
					primaryColor: '#4f46e5',
					primaryTextColor: '#e0e0f0',
					primaryBorderColor: '#6366f1',
					lineColor: '#6366f1',
					secondaryColor: '#1e1b4b',
					tertiaryColor: '#1a1a2e',
					noteBkgColor: '#1a1a2e',
					noteTextColor: '#a0a0b8',
					actorBkg: '#1a1a2e',
					actorBorder: '#6366f1',
					actorTextColor: '#e0e0f0',
					signalColor: '#e0e0f0',
					signalTextColor: '#e0e0f0',
					labelBoxBkgColor: '#1a1a2e',
					labelBoxBorderColor: '#6366f1',
					labelTextColor: '#e0e0f0',
					loopTextColor: '#a0a0b8',
					activationBorderColor: '#6366f1',
					activationBkgColor: '#1e1b4b',
					sequenceNumberColor: '#fff',
				},
			});

			const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);
			if (!cancelled) {
				setSvg(rendered);
			}
		}

		render();
		return () => {
			cancelled = true;
		};
	}, [chart, id]);

	return (
		<div
			ref={containerRef}
			style={{
				padding: '24px 16px',
				borderRadius: 12,
				background: '#0d0d14',
				border: '1px solid #2a2a3e',
				overflow: 'auto',
			}}
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
