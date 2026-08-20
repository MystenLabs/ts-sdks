import { expect, test } from 'vitest';

import { PredictClient, TESTNET_CONFIG } from '../src/index.js';

// Trivial "package exports load" smoke: the public surface resolves and the bundled
// testnet config is the testnet one. (SDK_NAME was removed from the public surface.)
test('package exports load', () => {
	expect(PredictClient).toBeDefined();
	expect(TESTNET_CONFIG).toBeDefined();
	expect(TESTNET_CONFIG.network).toBe('testnet');
});
