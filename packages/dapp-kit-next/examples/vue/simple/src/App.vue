<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { dAppKit } from './dapp-kit';

const connection = useStore(dAppKit.stores.$connection);
</script>

<template>
	<div>
		<mysten-dapp-kit-connect-button :instance="dAppKit" />
		<div v-if="connection.account">
			<h2>Connected Account</h2>
			<p><strong>Wallet:</strong> {{ connection.wallet?.name }}</p>
			<p><strong>Address:</strong> {{ connection.account.address }}</p>
		</div>
	</div>
</template>
