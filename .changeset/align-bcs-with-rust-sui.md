---
'@mysten/sui': major
---

Align BCS Object and Effects schemas exactly with Rust implementation

**Breaking Changes:**

- **ExecutionStatus**: Renamed variant `Failed` → `Failure` to match Rust implementation
- **UnchangedSharedKind**: Renamed to `UnchangedConsensusKind` and removed obsolete variants (`MutateDeleted`, `ReadDeleted`)
- **ExecutionCancelledDueToSharedObjectCongestion**: Fixed field name from `congestedObjects` to `congested_objects` (snake_case)
- Renamed BCS Owner enum variant: `ConsensusV2` → `ConsensusAddressOwner`
- Renamed Data enum variant: `data.MoveObject` → `data.Move`
- Renamed exported schema: `ObjectBcs` → `bcs.Object`
- Renamed TransactionEffectsV2 field: `unchangedSharedObjects` → `unchangedConsensusObjects`

**New Error Variants Added:**

ExecutionFailureStatus:

- `MoveVectorElemTooBig`
- `MoveRawValueTooBig`
- `InvalidLinkage`
- `InsufficientBalanceForWithdraw`
- `NonExclusiveWriteInputObjectModified`

CommandArgumentError:

- `InvalidArgumentArity`
- `InvalidTransferObject`
- `InvalidMakeMoveVecNonObjectArgument`
- `ArgumentWithoutValue`
- `CannotMoveBorrowedValue`
- `CannotWriteToExtendedReference`
- `InvalidReferenceArgument`

**New Types:**

- Added complete Object BCS schema matching Rust's ObjectInner
- Added `MovePackage` type for package objects
- Added `TypeOrigin` for tracking type definitions
- Added `UpgradeInfo` for package upgrade tracking
- Added `Data.Package` variant (was missing)
- Added accumulator types: `AccumulatorWriteV1`, `AccumulatorAddress`, `AccumulatorOperation`, `AccumulatorValue`
- Added `ObjectOut.AccumulatorWriteV1` variant
- Added UnchangedConsensusKind variants: `MutateConsensusStreamEnded`, `ReadConsensusStreamEnded`, `Cancelled`, `PerEpochConfig`
- Moved all Object BCS definitions from separate file into main bcs.ts

**Migration Guide:**

```typescript
// ExecutionStatus variant name change
// Before
if (effects.status.$kind === 'Success') { ... }
const error = effects.status.Failed.error;

// After
if (effects.status.$kind === 'Success') { ... }
const error = effects.status.Failure.error;

// UnchangedSharedKind → UnchangedConsensusKind
// Before
effects.unchangedSharedObjects.forEach(([id, obj]) => {
    if (obj.$kind === 'MutateDeleted') { ... }
});

// After
effects.unchangedConsensusObjects.forEach(([id, obj]) => {
    if (obj.$kind === 'MutateConsensusStreamEnded') { ... }
});
```
