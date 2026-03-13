// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { CopyController } from './copy-controller.js';
import { sectionHeaderStyles, sharedStyles, stateStyles } from './styles.js';
import { getTypeName, isCoinType } from './utils.js';

interface OwnedObject {
	objectId: string;
	type: string;
	typeName: string;
	version: string;
	displayName: string | null;
	description: string | null;
	imageUrl: string | null;
}

@customElement('dev-wallet-objects')
export class DevWalletObjects extends LitElement {
	static override styles = [
		sharedStyles,
		sectionHeaderStyles,
		stateStyles,
		css`
			:host {
				display: block;
			}

			.object-list {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}

			.object-item {
				display: flex;
				gap: 10px;
				padding: 10px 12px;
				border-radius: var(--dev-wallet-radius-sm);
				border: 1px solid var(--dev-wallet-border);
				background: var(--dev-wallet-secondary);
				align-items: flex-start;
			}

			.object-thumb {
				width: 40px;
				height: 40px;
				border-radius: var(--dev-wallet-radius-xs);
				object-fit: cover;
				flex-shrink: 0;
			}

			.object-body {
				display: flex;
				flex-direction: column;
				gap: 2px;
				flex: 1;
				min-width: 0;
			}

			.object-top {
				display: flex;
				justify-content: space-between;
				align-items: center;
			}

			.object-type {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.object-type-badge {
				font-size: 10px;
				color: var(--dev-wallet-muted-foreground);
				opacity: 0.8;
			}

			.object-description {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.object-version {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				flex-shrink: 0;
			}

			.object-id {
				font-size: 11px;
				font-family: var(--dev-wallet-font-mono);
				color: var(--dev-wallet-muted-foreground);
				cursor: pointer;
				border-radius: var(--dev-wallet-radius-2xs);
				padding: 1px 2px;
				margin: -1px -2px;
				transition: background 0.15s;
			}

			.object-id:hover {
				background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
			}

			.object-id.copied {
				color: var(--dev-wallet-positive);
			}

			.load-more {
				margin-top: 8px;
				width: 100%;
				padding: 8px;
				border-radius: var(--dev-wallet-radius-sm);
				font-size: 12px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-primary);
				background: transparent;
				border: 1px solid var(--dev-wallet-border);
				transition: background 0.15s;
			}

			.load-more:hover {
				background: var(--dev-wallet-secondary);
			}

			.load-more:disabled {
				opacity: 0.5;
				cursor: default;
			}
		`,
	];

	@property({ type: String })
	address = '';

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	@state()
	private _objects: OwnedObject[] = [];

	@state()
	private _loading = false;

	@state()
	private _loadingMore = false;

	@state()
	private _error: string | null = null;

	@state()
	private _hasNextPage = false;

	#copy = new CopyController(this);
	#cursor: string | null = null;
	#lastFetchedAddress = '';
	#lastFetchedClient: ClientWithCoreApi | null = null;
	#fetchGeneration = 0;

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (
			(changedProperties.has('address') || changedProperties.has('client')) &&
			this.address &&
			this.client &&
			(this.address !== this.#lastFetchedAddress || this.client !== this.#lastFetchedClient)
		) {
			this.#fetchObjects(false);
		}
	}

	override render() {
		if (!this.address || !this.client) {
			return nothing;
		}

		return html`
			<h3 class="section-header">Objects</h3>
			${this._loading
				? html`<div class="loading" part="loading" aria-live="polite">Loading...</div>`
				: this._error
					? html`<div class="error-state" part="error-message" aria-live="polite">
							${this._error}
						</div>`
					: this._objects.length === 0
						? html`<div class="empty-state" part="empty-state">No objects found</div>`
						: html`
								<div class="object-list" part="object-list">
									${this._objects.map(
										(obj) => html`
											<div class="object-item">
												${obj.imageUrl && /^https?:\/\//i.test(obj.imageUrl)
													? html`<img
															class="object-thumb"
															src=${obj.imageUrl}
															alt=${obj.displayName ?? obj.typeName}
															@error=${(e: Event) =>
																((e.target as HTMLImageElement).style.display = 'none')}
														/>`
													: nothing}
												<div class="object-body">
													<div class="object-top">
														<span class="object-type"> ${obj.displayName ?? obj.typeName} </span>
														<span class="object-version">v${obj.version}</span>
													</div>
													${obj.displayName
														? html`<span class="object-type-badge">${obj.typeName}</span>`
														: nothing}
													${obj.description
														? html`<span class="object-description">${obj.description}</span>`
														: nothing}
													<span
														class="object-id ${this.#copy.isCopied(obj.objectId) ? 'copied' : ''}"
														title="Click to copy"
														role="button"
														tabindex="0"
														aria-label="Copy object ID"
														@click=${() => this.#copy.copy(obj.objectId)}
														@keydown=${(e: KeyboardEvent) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault();
																this.#copy.copy(obj.objectId);
															}
														}}
													>
														${this.#copy.isCopied(obj.objectId)
															? 'Copied!'
															: `${obj.objectId.slice(0, 10)}...${obj.objectId.slice(-8)}`}
													</span>
												</div>
											</div>
										`,
									)}
								</div>
								${this._hasNextPage
									? html`
											<button
												class="load-more"
												part="load-more-button"
												?disabled=${this._loadingMore}
												@click=${this.#loadMore}
											>
												${this._loadingMore ? 'Loading...' : 'Load More'}
											</button>
										`
									: nothing}
							`}
		`;
	}

	async #fetchObjects(append: boolean) {
		this.#lastFetchedAddress = this.address;
		this.#lastFetchedClient = this.client;

		if (!append) {
			this.#cursor = null;
			this._objects = [];
		}

		const generation = ++this.#fetchGeneration;
		if (append) {
			this._loadingMore = true;
		} else {
			this._loading = true;
		}
		this._error = null;

		try {
			const result = await this.client!.core.listOwnedObjects({
				owner: this.address,
				limit: 20,
				cursor: this.#cursor,
				include: { json: true },
			});

			if (generation !== this.#fetchGeneration) return;

			// Filter out Coin types — those are shown in the balances tab
			const nonCoinObjects: OwnedObject[] = result.objects
				.filter((obj) => !isCoinType(obj.type))
				.map((obj) => {
					const json = obj.json;
					return {
						objectId: obj.objectId,
						type: obj.type,
						typeName: getTypeName(obj.type),
						version: obj.version,
						displayName: extractString(json, 'name'),
						description: extractString(json, 'description'),
						imageUrl: extractString(json, 'image_url') ?? extractString(json, 'img_url'),
					};
				});

			this._objects = append ? [...this._objects, ...nonCoinObjects] : nonCoinObjects;
			this._hasNextPage = result.hasNextPage;
			this.#cursor = result.cursor;
		} catch {
			if (generation !== this.#fetchGeneration) return;
			this._error = 'Failed to load objects';
			if (!append) this._objects = [];
		} finally {
			if (generation === this.#fetchGeneration) {
				this._loading = false;
				this._loadingMore = false;
			}
		}
	}

	#loadMore() {
		this.#fetchObjects(true);
	}
}

function extractString(
	json: Record<string, unknown> | null | undefined,
	key: string,
): string | null {
	if (!json) return null;
	const val = json[key];
	return typeof val === 'string' && val.length > 0 ? val : null;
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-objects': DevWalletObjects;
	}
}
