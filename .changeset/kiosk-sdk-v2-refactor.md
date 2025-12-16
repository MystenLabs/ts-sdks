---
'@mysten/kiosk': major
---

### Breaking Changes

**Removed deprecated `transactionBlock` parameter**

The deprecated `transactionBlock` parameter has been removed from `KioskTransaction`, `TransferPolicyTransaction`, and rule resolving functions. Use `transaction` instead:

```diff
const kioskTx = new KioskTransaction({
-  transactionBlock: tx,
+  transaction: tx,
   kioskClient,
   cap,
});
```

**Removed low-level transaction helper functions**

The following low-level helper functions have been removed. Use `KioskTransaction` and `TransferPolicyTransaction` classes instead:

From kiosk operations:

- `createKiosk` - use `kioskTx.create()`
- `shareKiosk` - use `kioskTx.share()`
- `place` - use `kioskTx.place()`
- `lock` - use `kioskTx.lock()`
- `take` - use `kioskTx.take()`
- `list` - use `kioskTx.list()`
- `delist` - use `kioskTx.delist()`
- `placeAndList` - use `kioskTx.placeAndList()`
- `purchase` - use `kioskTx.purchase()`
- `withdrawFromKiosk` - use `kioskTx.withdraw()`
- `borrowValue` - use `kioskTx.borrow()`
- `returnValue` - use `kioskTx.return()`

From transfer policy operations:

- `createTransferPolicyWithoutSharing` - use `tpTx.create()`
- `shareTransferPolicy` - use `tpTx.shareAndTransferCap()`
- `confirmRequest` - handled automatically by `kioskTx.purchaseAndResolve()`
- `removeTransferPolicyRule` - use `tpTx.removeRule()`

From personal kiosk operations:

- `convertToPersonalTx` - use `kioskTx.convertToPersonal()`
- `transferPersonalCapTx` - handled automatically by `kioskTx.finalize()`

From rule attachment:

- `attachKioskLockRuleTx` - use `tpTx.addLockRule()`
- `attachRoyaltyRuleTx` - use `tpTx.addRoyaltyRule()`
- `attachPersonalKioskRuleTx` - use `tpTx.addPersonalKioskRule()`
- `attachFloorPriceRuleTx` - use `tpTx.addFloorPriceRule()`

**Updated client requirements**

The SDK now uses the core client API (`ClientWithCoreApi`) instead of direct JSON-RPC types. Update your `KioskClient` initialization:

```diff
const kioskClient = new KioskClient({
-  client: new SuiClient({ url: getFullnodeUrl('mainnet') }),
+  client: new SuiJsonRpcClient({
+    url: getJsonRpcFullnodeUrl('mainnet'),
+    network: 'mainnet',
+  }),
   network: Network.MAINNET,
});
```

**Removed BCS exports**

The `KioskType` and other BCS type exports from `bcs.ts` have been removed. The SDK now uses generated contract bindings internally.
