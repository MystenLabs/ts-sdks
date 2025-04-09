import './App.css';

import '@mysten/dapp-kit-next';

function App() {
	return (
		<div>
			<h1>React + Vite dApp</h1>

			<dapp-kit-connect-modal />
		</div>
	);
}

export default App;
