<script lang="ts">
	import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
	import { getWalletUniqueIdentifier } from '../../utils/walletUtils.js';
	import type { DappKitStore } from '../../store/index.js';

	const {
		store,
		selectedWallet,
		onSelectWallet,
	}: {
		store: DappKitStore;
		selectedWallet: WalletWithRequiredFeatures | null;
		onSelectWallet: (wallet: WalletWithRequiredFeatures) => void;
	} = $props();

	const stateStore = store.atoms.$state;

	const wallets = $derived($stateStore.wallets);
</script>

<ul class="wallet-list">
	<!-- TODO: Handle 0 wallets case: -->
	{#each wallets as wallet}
		<li>
			<button
				class="wallet-list-item"
				class:wallet-list-item--selected={selectedWallet
					? getWalletUniqueIdentifier(selectedWallet) === getWalletUniqueIdentifier(wallet)
					: false}
				type="button"
				onclick={() => {
					onSelectWallet(wallet);
				}}
			>
				<img class="wallet-list-item-icon" src={wallet.icon} alt={`${wallet.name} logo`} />
				<div>{wallet.name}</div>
			</button>
		</li>
	{/each}
</ul>

<style>
	.wallet-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.wallet-list-item {
		display: flex;
		align-items: center;
		flex-grow: 1;
		padding: 8px;
		gap: 8px;
		border-radius: 16px;
	}

	.wallet-list-item:hover {
		background-color: var(--secondary-background-color);
	}

	.wallet-list-item--selected {
		background-color: var(--wallet-item-selected-color) !important;
		box-shadow: var(--shadow-wallet-item-selected);
	}

	.wallet-list-item-icon {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		object-fit: cover;
		border-radius: var(--radii-small);
	}
</style>
