// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { useState, useRef } from 'react';

import { WalrusClient } from '../../src/client.js';
import type { WriteFilesFlow } from '../../src/index.js';
import { WalrusFile } from '../../src/index.js';

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

export function FileUpload({ onComplete }: { onComplete: (ids: string[]) => void }) {
	const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const currentAccount = useCurrentAccount();
	const flowRef = useRef<WriteFilesFlow | null>(null);
	const [state, setState] = useState<
		| 'empty'
		| 'encoding'
		| 'encoded'
		| 'registering'
		| 'uploading'
		| 'uploaded'
		| 'certifying'
		| 'done'
	>('empty');

	if (!currentAccount) {
		return <div>No account connected</div>;
	}

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			flowRef.current = null;
			setState('empty');
			return;
		}

		setState('encoding');

		const arrayBuffer = await file.arrayBuffer();
		const flow = walrusClient.writeFilesFlow({
			files: [
				WalrusFile.from({
					contents: new Uint8Array(arrayBuffer),
					identifier: file.name,
				}),
			],
			epochs: 3,
			owner: currentAccount!.address,
			deletable: true,
		});

		flowRef.current = flow;
		await flow.encode();
		setState('encoded');
	};

	return (
		<div>
			<input type="file" onChange={handleFileChange} disabled={state !== 'empty'} />
			<button onClick={registerBlob} disabled={state !== 'encoded'}>
				Register blob
			</button>
			<button onClick={certifyBlob} disabled={state !== 'uploaded'}>
				Certify blob
			</button>
		</div>
	);

	async function registerBlob() {
		if (!flowRef.current) return;

		setState('registering');
		const registerBlobTransaction = flowRef.current.register();

		await signAndExecuteTransaction({ transaction: registerBlobTransaction });
		setState('uploading');

		await flowRef.current.upload();

		setState('uploaded');
	}

	async function certifyBlob() {
		if (!flowRef.current) return;

		setState('certifying');
		const certifyTransaction = flowRef.current.certify();

		await signAndExecuteTransaction({ transaction: certifyTransaction });

		const files = await flowRef.current.listFiles();
		setState('done');

		onComplete(files.map((file) => file.id));
	}
}
