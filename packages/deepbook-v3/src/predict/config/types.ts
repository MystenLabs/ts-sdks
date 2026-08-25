/** The three published Move packages a Predict deployment spans. */
export interface PredictPackages {
	predict: string;
	account: string;
	propbook: string;
}

/**
 * Per-underlying oracle wiring: the propbook underlying id plus the feed object ids the
 * live pricer reads. Names mirror the deployment manifest
 * (`packages/predict/deployment/deployment.testnet.json` → `underlyings`).
 */
export interface UnderlyingConfig {
	symbol: string;
	propbookUnderlyingId: number;
	/** `&PythFeed` — spot price feed. */
	pythFeed: string;
	/** `&BlockScholesValueStore` — Black-Scholes value store. */
	blockScholesValueStore: string;
	/** `&BlockScholesSVIStore` — SVI-surface store. */
	blockScholesSviStore: string;
}

/** Everything a tx builder or read needs to address a Predict deployment on one network. */
export interface PredictConfig {
	network: 'testnet' | 'mainnet' | 'custom';
	packages: PredictPackages;
	objects: {
		registry: string;
		protocolConfig: string;
		poolVault: string;
		oracleRegistry: string;
		accountRegistry: string;
	};
	quoteCoinType: string; // DUSDC on testnet
	underlyings: Record<string, UnderlyingConfig>; // keyed by symbol, e.g. "BTC"
}
