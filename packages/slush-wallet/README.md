# `@mysten/slush-wallet`

⚠️ **Warning**: This package is in active development and should be used with caution. APIs are
experimental and subject to breaking changes without notice. This should not be used in production
enviornments until further notice.

This package provides support for the new **Slush** web wallet.

If you're currently using `@mysten/zksend`'s `registerStashedWallet`, you should migrate to this
package (no sooner than 0X/XX/2025) to ensure compatibility with the new Slush experience.

## 🚀 Installation

```bash
pnpm install @mysten/slush-wallet
```

## 🔁 Migration

If you're using `registerStashedWallet`, switch to `registerSlushWallet`:

**Before:**

```ts
import { registerStashedWallet } from '@mysten/stashed-wallet';

registerStashedWallet(...);
```

**After:**

```ts
import { registerSlushWallet } from '@mysten/slush-wallet';

registerSlushWallet(...);
```

That's it — you're now using Slush!

```

```
