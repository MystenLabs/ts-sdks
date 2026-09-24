// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

//
// CodeBlock — a wrapper around the Fumadocs code block that adds an
// "Open in agent" action next to the built-in copy button. Readers can send
// the snippet straight to an AI agent (Claude or ChatGPT) with the code
// pre-filled as the prompt.
//
// This replaces the default `pre` MDX component (registered in
// app/[[...slug]]/page.tsx), so it applies to every fenced code block in the
// docs automatically — no per-page markup required.
//

'use client';

import {
	CodeBlock as FumaCodeBlock,
	Pre,
	type CodeBlockProps,
} from 'fumadocs-ui/components/codeblock';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Agent {
	id: string;
	label: string;
	url: (prompt: string) => string;
}

const AGENTS: Agent[] = [
	{
		id: 'claude',
		label: 'Claude',
		url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
	},
	{
		id: 'chatgpt',
		label: 'ChatGPT',
		url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
	},
	// Note: Gemini's web app (gemini.google.com/app) does not support prefilling a
	// prompt via query string — the param is silently ignored and it opens empty.
	// Only agents with working prompt prefill are listed here.
];

function cx(...parts: (string | false | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}

// Pull the plain-text code out of the rendered code block. Mirrors the approach
// the Fumadocs copy button uses: clone the <pre>, drop copy-ignored nodes, and
// read textContent so we don't capture line numbers or button labels.
function readCode(container: HTMLElement | null): string {
	const pre = container?.getElementsByTagName('pre').item(0);
	if (!pre) return '';
	const clone = pre.cloneNode(true) as HTMLElement;
	clone.querySelectorAll('.nd-copy-ignore').forEach((node) => node.replaceWith('\n'));
	return clone.textContent ?? '';
}

const AGENT_PROMPT_PREFIX =
	'I found this code snippet in the Sui TypeScript SDK docs. Explain what it does and help me adapt it to my project:\n\n';

// Robot glyph, sized to match the Fumadocs copy button icon.
function BotIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 8V4H8" />
			<rect width="16" height="12" x="4" y="8" rx="2" />
			<path d="M2 14h2" />
			<path d="M20 14h2" />
			<path d="M15 13v2" />
			<path d="M9 13v2" />
		</svg>
	);
}

function OpenInAgentButton({ figureRef }: { figureRef: React.RefObject<HTMLElement | null> }) {
	const [open, setOpen] = useState(false);
	const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
	const btnRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	// Position the menu just below the button using viewport coordinates. The
	// menu renders in a portal on document.body so the code block's
	// `overflow-hidden` can't clip it.
	const positionMenu = () => {
		const rect = btnRef.current?.getBoundingClientRect();
		if (!rect) return;
		setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
	};

	const toggle = () => {
		if (!open) positionMenu();
		setOpen((v) => !v);
	};

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			const target = e.target as Node;
			if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
				setOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		const onReflow = () => setOpen(false);
		document.addEventListener('mousedown', onClick);
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', onReflow);
		window.addEventListener('scroll', onReflow, true);
		return () => {
			document.removeEventListener('mousedown', onClick);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onReflow);
			window.removeEventListener('scroll', onReflow, true);
		};
	}, [open]);

	const hrefFor = (agent: Agent) => agent.url(AGENT_PROMPT_PREFIX + readCode(figureRef.current));

	return (
		<>
			<button
				ref={btnRef}
				type="button"
				aria-label="Open in agent"
				aria-expanded={open}
				className="inline-flex items-center justify-center rounded-md p-1 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground [&_svg]:size-4"
				onClick={toggle}
			>
				<BotIcon />
			</button>
			{open &&
				coords &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						ref={menuRef}
						className="fixed z-50 min-w-36 rounded-lg border bg-fd-popover p-1 text-fd-popover-foreground shadow-lg"
						style={{ top: coords.top, right: coords.right }}
					>
						<div className="px-2 py-1 text-xs font-medium text-fd-muted-foreground">Open in</div>
						{AGENTS.map((agent) => (
							<a
								key={agent.id}
								href={hrefFor(agent)}
								target="_blank"
								rel="noopener noreferrer"
								className="block rounded-md px-2 py-1.5 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground"
								onClick={() => setOpen(false)}
							>
								{agent.label}
							</a>
						))}
					</div>,
					document.body,
				)}
		</>
	);
}

function CustomCodeBlock(props: CodeBlockProps) {
	const figureRef = useRef<HTMLElement | null>(null);
	return (
		<FumaCodeBlock
			ref={figureRef}
			{...props}
			Actions={({ className, children }: { className?: string; children?: ReactNode }) => (
				<div className={cx('flex items-center gap-1', className)}>
					<OpenInAgentButton figureRef={figureRef} />
					{children}
				</div>
			)}
		/>
	);
}

// Drop-in replacement for the default `pre` MDX component.
export function CodeBlock(props: ComponentProps<'pre'>) {
	return (
		<CustomCodeBlock {...(props as CodeBlockProps)}>
			<Pre>{props.children}</Pre>
		</CustomCodeBlock>
	);
}

export default CodeBlock;
