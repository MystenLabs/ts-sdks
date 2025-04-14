import { useStore } from '@nanostores/react';
import { getDefaultStore, getWalletUniqueIdentifier } from '@mysten/dapp-kit-next';

const dAppKitStore = getDefaultStore();

function App() {
	const wallets = useStore(dAppKitStore.$wallets);

	return (
		<div>
			<p>TODO: Flesh this out more / make it more use case specific ^.^</p>
			{wallets.length > 0 ? (
				<ul>
					{wallets.map((wallet) => (
						<li key={getWalletUniqueIdentifier(wallet)}>{wallet.name}</li>
					))}
				</ul>
			) : (
				<p>No registered wallets</p>
			)}
		</div>
	);
}

export default App;
