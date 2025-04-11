<svelte:options
	customElement={{
		tag: 'dapp-kit-connect-modal',
	}}
/>

<script lang="ts">
	import WalletList from './internal/wallet-list.svelte';
</script>

<div>
	hello
	<WalletList />
</div>

<style>
	div {
		background-color: red;
		width: 50px;
		height: 50px;
	}
</style>
