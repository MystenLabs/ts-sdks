---
'@mysten/dapp-kit-react': major
---

Move `ConnectButton` and `ConnectModal` to a new `@mysten/dapp-kit-react/ui` subpath export to avoid loading the `@webcomponents/scoped-custom-element-registry` polyfill when only using hooks and providers.

**Breaking change:** Update imports from:
```ts
import { ConnectButton, ConnectModal } from '@mysten/dapp-kit-react';
```
to:
```ts
import { ConnectButton, ConnectModal } from '@mysten/dapp-kit-react/ui';
```
