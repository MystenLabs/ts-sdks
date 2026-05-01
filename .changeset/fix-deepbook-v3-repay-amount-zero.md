---
'@mysten/deepbook-v3': patch
---

Fix `MarginManagerContract.repayBase` and `repayQuote` mishandling `amount = 0`. The previous truthy guard (`amount ? … : null`) collapsed `0` onto the `Option::None` branch, causing `repay_base(mgr, 0)` / `repay_quote(mgr, 0)` to repay the full outstanding debt using whatever balance of the asset was held in the balance manager — rather than being a no-op as the numeric argument suggests. The check now uses `amount !== undefined`, so `0` correctly serializes as `Option::Some(0)` and only an omitted argument becomes `None`. Also switches the `Option<u64>` argument from `tx.object.option` to `tx.pure.option` to avoid an extra `0x1::option::some/none` PTB command, matching `marginLiquidations.ts` and `marginPool.ts`.
