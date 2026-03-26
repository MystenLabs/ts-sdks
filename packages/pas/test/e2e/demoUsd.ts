import { Transaction } from '@mysten/sui/transactions';

import { execSuiTools, type PublishedPackage, type TestToolbox } from './setup.js';

export class DemoUsdTestHelpers {
	toolbox: TestToolbox;
	#publicationData: PublishedPackage | undefined;
	#cacheKey: string;

	constructor(toolbox: TestToolbox, cacheKey?: string) {
		this.toolbox = toolbox;
		this.#cacheKey = cacheKey ?? 'demo_usd';
	}

	get pub() {
		if (!this.#publicationData) {
			throw new Error('Publication data not found. Call `createPolicy` first.');
		}
		return this.#publicationData;
	}

	// setup the policy
	async createPolicy() {
		if (this.#publicationData) {
			return this.#publicationData;
		}

		// When using a custom cache key, copy the source to a unique container
		// directory so test-publish treats it as a separate package instance.
		let packagePath = 'demo_usd';
		if (this.#cacheKey !== 'demo_usd') {
			await execSuiTools(['cp', '-r', '/test-data/demo_usd', `/test-data/${this.#cacheKey}`]);
			packagePath = this.#cacheKey;
		}

		const result = await this.toolbox.publishPackage(packagePath, this.#cacheKey);
		this.#publicationData = result;

		const faucetId = result.createdObjects.find((o) => o.type.endsWith('demo_usd::Faucet'))!.id;
		const templateRegistryId = this.toolbox.client.pas.deriveTemplateRegistryAddress();

		const transaction = new Transaction();
		transaction.moveCall({
			target: `${result.originalId}::demo_usd::setup`,
			arguments: [
				transaction.object(this.toolbox.client.pas.getPackageConfig().namespaceId),
				transaction.object(templateRegistryId),
				transaction.object(faucetId),
			],
		});

		await this.toolbox.executeTransaction(transaction);

		return this.#publicationData;
	}

	async mintFromFaucetInto(amount: number, to: string) {
		const transaction = new Transaction();
		const balance = transaction.moveCall({
			target: `${this.pub.originalId}::demo_usd::faucet_mint_balance`,
			arguments: [
				transaction.object(
					this.pub.createdObjects.find((o) => o.type.endsWith('demo_usd::Faucet'))!.id,
				),
				transaction.pure.u64(amount * 1_000_000),
			],
		});

		transaction.moveCall({
			target: `0x2::balance::send_funds`,
			arguments: [balance, transaction.pure.address(to)],
			typeArguments: [this.demoUsdAssetType],
		});

		await this.toolbox.executeTransaction(transaction);
	}

	async upgradeToV2() {
		const policyId = this.toolbox.client.pas.derivePolicyAddress(this.demoUsdAssetType);
		const templateRegistryId = this.toolbox.client.pas.deriveTemplateRegistryAddress();
		const faucetId = this.pub.createdObjects.find((o) => o.type.endsWith('demo_usd::Faucet'))!.id;

		const tx = new Transaction();
		tx.moveCall({
			target: `${this.pub.originalId}::demo_usd::use_v2`,
			arguments: [tx.object(policyId), tx.object(templateRegistryId), tx.object(faucetId)],
		});
		await this.toolbox.executeTransaction(tx);
	}

	get demoUsdAssetType() {
		return `${this.pub.originalId}::demo_usd::DEMO_USD`;
	}
}
