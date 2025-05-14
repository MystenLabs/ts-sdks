// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';

const suiClient = new SuiClient({
	url: getFullnodeUrl('testnet'),
});

const walrusClient = new WalrusClient({
	network: 'testnet',
	suiClient,
	storageNodeClientOptions: {
		timeout: 60_000,
	},
});

export function FileUpload() {
	const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const currentAccount = useCurrentAccount();

	if (!currentAccount) {
		return <div>No account connected</div>;
	}

	return <button onClick={uploadFile}>Upload File</button>;

	async function uploadFile() {
		const file = new TextEncoder().encode('Hello from the TS SDK!!!\n');

		const encoded = await walrusClient.encodeBlob(file);

		const registerBlobTransaction = await walrusClient.registerBlobTransaction({
			blobId: encoded.blobId,
			rootHash: encoded.rootHash,
			size: file.length,
			deletable: true,
			epochs: 3,
			owner: currentAccount!.address,
		});
		registerBlobTransaction.setSender(currentAccount!.address);

		const { digest } = await signAndExecuteTransaction({ transaction: registerBlobTransaction });

		const { objectChanges, effects } = await suiClient.waitForTransaction({
			digest,
			options: { showObjectChanges: true, showEffects: true },
		});

		if (effects?.status.status !== 'success') {
			throw new Error('Failed to register blob');
		}

		const blobType = await walrusClient.getBlobType();

		const blobObject = objectChanges?.find(
			(change) => change.type === 'created' && change.objectType === blobType,
		);

		if (!blobObject || blobObject.type !== 'created') {
			throw new Error('Blob object not found');
		}

		const confirmations = await walrusClient.writeEncodedBlobToNodes({
			blobId: encoded.blobId,
			metadata: encoded.metadata,
			sliversByNode: encoded.sliversByNode,
			deletable: true,
			objectId: blobObject.objectId,
		});

		const certifyBlobTransaction = await walrusClient.certifyBlobTransaction({
			blobId: encoded.blobId,
			blobObjectId: blobObject.objectId,
			confirmations,
			deletable: true,
		});
		certifyBlobTransaction.setSender(currentAccount!.address);

		const { digest: certifyDigest } = await signAndExecuteTransaction({
			transaction: certifyBlobTransaction,
		});

		const { effects: certifyEffects } = await suiClient.waitForTransaction({
			digest: certifyDigest,
			options: { showEffects: true },
		});

		if (certifyEffects?.status.status !== 'success') {
			throw new Error('Failed to certify blob');
		}

		return encoded.blobId;
	}
}
