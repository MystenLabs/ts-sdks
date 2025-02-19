<svelte:options
	customElement={{
		tag: 'dapp-kit-connect-modal',
		props: {
			open: { reflect: true, type: 'Boolean', attribute: 'open' },
		},
	}}
/>

<script lang="ts">
	import { createDappKitStore } from '../store/index.js';
	import type { DappKitStore } from '../store/index.js';
	import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
	import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
	import WalletList from './internal/wallet-list.svelte';

	let { store: dappKitStore, open }: { store?: DappKitStore; open?: boolean } = $props();

	if (!dappKitStore) {
		// TODO: Get store from global
		dappKitStore = createDappKitStore({
			client: new SuiClient({ url: getFullnodeUrl('mainnet') }),
		});
	}

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	});

	function handleClose() {
		$host().dispatchEvent(new CustomEvent('close'));
	}

	let selectedWallet: WalletWithRequiredFeatures | null = $state(null);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	part="dialog"
	bind:this={dialog}
	oncancel={() => {
		handleClose();
	}}
	onclick={(e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}}
	onkeydown={() => {
		// TODO: This isn't needed I just wanted to shut up lint.
		// if (e.key === 'Escape') {
		// 	handleClose();
		// }
	}}
>
	<div class="content">
		<div
			class="wallet-list-container"
			class:wallet-list-container--view-selected={!!selectedWallet}
		>
			<div class="wallet-list-content">
				<h2 part="title" class="title">Connect a Wallet</h2>

				<WalletList
					store={dappKitStore}
					{selectedWallet}
					onSelectWallet={(wallet) => {
						selectedWallet = wallet;
					}}
				/>
			</div>
		</div>

		<div class="view-container" class:view-container--selected={!!selectedWallet}>
			<div class="view-content">
				<h2 class="view-header">What is a Wallet</h2>

				TODO: Selected View
				<!-- {this.#selectedWallet
					? html`<dapp-kit-internal-connect
							.store=${this.store}
							.selectedWallet=${this.#selectedWallet}
						></dapp-kit-internal-connect>`
					: nothing} -->
			</div>
		</div>

		<div class="close-button-container">
			<button
				type="button"
				part="close"
				aria-label="close"
				formnovalidate
				onclick={() => {
					handleClose();
				}}
			>
				Close
			</button>
		</div>
	</div>
</dialog>

<style>
	dialog {
		background-color: var(--primary-background-color);
		border-radius: var(--radii-large);
		color: var(--body-color);
		overflow: hidden;
		min-height: 50vh;
		max-height: 85vh;
		max-width: 700px;
		width: 100%;
	}

	dialog::backdrop {
		background: var(--modal-backdrop-background);
		backdrop-filter: var(--modal-backdrop-filter);
	}

	dialog[open] {
		display: flex;
		flex-direction: column;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	@media (min-width: 768px) {
		.content {
			flex-direction: row;
		}
	}

	h2 {
		font-size: var(--font-size-large);
		font-weight: var(--font-weight-bold);
	}

	.title {
		padding-left: 8px;
	}

	.view-container {
		display: none;
		padding: 20px;
		flex-grow: 1;

		@media (min-width: 768px) {
			display: flex;
		}
	}

	.view-container--selected {
		display: flex;
	}

	.back-button-container {
		position: absolute;
		top: 20px;
		left: 20px;

		@media (min-width: 768px) {
			display: none;
		}
	}

	.close-button-container {
		position: absolute;
		top: 16px;
		right: 16px;
	}

	.wallet-list-content {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		gap: 24px;
		padding: 20px;
		background-color: var(--primary-background-color);

		@media (min-width: 768px) {
			background-color: var(--secondary-background-color);
		}
	}

	.wallet-list-container {
		display: flex;
		justify-content: space-between;
		flex-direction: column;
		flex-grow: 1;

		@media (min-width: 768px) {
			flex-direction: row;
			flex-basis: 240px;
			flex-grow: 0;
			flex-shrink: 0;
		}
	}

	.wallet-list-container--view-selected {
		display: none;

		@media (min-width: 768px) {
			display: flex;
		}
	}

	.view-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
		width: 100%;
		height: 100%;
	}

	.view-content-body {
		flex: 1;
	}

	.view-header {
		text-align: center;
	}
</style>
