---
'@mysten/deepbook-v3': minor
---

Add `cancelLiveOrder` and `cancelLiveOrders` transaction builders that skip order ids not currently in the balance manager's open orders (already filled, cancelled, expired-and-swept, or not owned by this BM) instead of aborting. Also updates mainnet `DEEPBOOK_PACKAGE_ID` to `0xf48222c4e057fa468baf136bff8e12504209d43850c5778f76159292a96f621e`.
