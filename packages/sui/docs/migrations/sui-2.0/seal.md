# @mysten/seal

> Migrate @mysten/seal to 2.0

The deprecated `SealClient.asClientExtension()` static method has been removed. Use the `seal()`
registration function instead:

```diff
- import { SealClient } from '@mysten/seal';
+ import { seal } from '@mysten/seal';

- const client = suiClient.$extend(SealClient.asClientExtension());
+ const client = suiClient.$extend(seal());
```
