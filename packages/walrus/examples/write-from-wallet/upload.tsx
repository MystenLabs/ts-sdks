// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useDAppKit, useSuiClient } from '@mysten/dapp-kit-react';
import { useState, useRef } from 'react';

import type { WalrusClient, WriteFilesFlow } from '../../src/index.js';
import { WalrusFile } from '../../src/index.js';
import type { SuiClient } from '@mysten/sui/client';

export function FileUpload({ onComplete }: { onComplete: (ids: string[]) => void }) {
	const dAppKit = useDAppKit();
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient() as SuiClient & { walrus: WalrusClient };
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
		const flow = suiClient.walrus.writeFilesFlow({
			files: [
				WalrusFile.from({
					contents: new Uint8Array(arrayBuffer),
					identifier: file.name,
				}),
			],
		});

		flowRef.current = flow;
		await flow.encode();
		setState('encoded');
	};

	return (
		<div>
			<input type="file" onChange={handleFileChange} disabled={state !== 'empty'} />
			<div>
				<p>State: {state}</p>
			</div>
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
		const registerBlobTransaction = flowRef.current.register({
			epochs: 3,
			owner: currentAccount!.address,
			deletable: true,
		});

		const { digest } = await dAppKit.signAndExecuteTransaction({
			transaction: registerBlobTransaction,
		});
		setState('uploading');

		await flowRef.current.upload({ digest });

		setState('uploaded');
	}

	async function certifyBlob() {
		if (!flowRef.current) return;

		setState('certifying');
		const certifyTransaction = flowRef.current.certify();

		await dAppKit.signAndExecuteTransaction({ transaction: certifyTransaction });

		const files = await flowRef.current.listFiles();
		setState('done');

		onComplete(files.map((file) => file.id));
	}
}
