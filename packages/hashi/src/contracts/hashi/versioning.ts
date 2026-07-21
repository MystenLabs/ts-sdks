/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Package version gating and upgrade authority.
 *
 * Holds the set of package versions allowed to run and custodies the package
 * `UpgradeCap`. The two live together because they are one lifecycle: committing
 * an upgrade through the cap auto-enables the new version. Every entry function
 * gates on `assert_version_enabled` so a disabled version cannot be executed.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_set from './deps/sui/vec_set.js';
import * as _package from './deps/sui/package.js';
const $moduleName = '@local-pkg/hashi::versioning';
export const Versioning = new MoveStruct({
	name: `${$moduleName}::Versioning`,
	fields: {
		/** Package versions allowed to run; gated on every entry. */
		enabled_versions: vec_set.VecSet(bcs.u64()),
		/**
		 * The package's UpgradeCap. Custodied here because committing an upgrade
		 * auto-enables the new version.
		 */
		upgrade_cap: bcs.option(_package.UpgradeCap),
	},
});
