import { useStore } from '@nanostores/react';
import './App.css';

import { $wallets, reg } from '@mysten/dapp-kit-next';
import { useRef, useState } from 'react';
import { StandardEvents } from '@mysten/wallet-standard';

function App() {
	const wallets = useStore($wallets);
	console.log('Render');
	console.log('Walllets', wallets);

	const b = useRef(null);

	const [a, setA] = useState(4);

	return (
		<div>
			<h1>React + Vite dApp</h1>
			<button
				onClick={() => {
					b.current = reg();
					setA((p) => p);
				}}
			>
				clickoooo
			</button>

			<button
				onClick={() => {
					b.current();
					b.current = null;
				}}
			>
				clickoooooooooo
			</button>

			<button
				onClick={() => {
					console.log('Connnect');
					wallets[wallets.length - 1].features['standard:connect'].connect();
				}}
			>
				fuk with properties
			</button>
		</div>
	);
}

export default App;
