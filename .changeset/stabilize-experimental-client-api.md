---
'@mysten/sui': major
---

Stabilize experimental client API by moving it from `@mysten/sui/experimental` to `@mysten/sui/client`:

- Moved client implementation from `src/experimental/` to `src/client/`
- Removed `Experimental_` prefix from all client types and classes
- Updated all internal packages to use the new stable API

Breaking changes:

- `@mysten/sui/experimental` module has been removed
- All `Experimental_` prefixed types/classes have been renamed (e.g., `Experimental_CoreClient` → `CoreClient`)
- Client types namespace changed from `Experimental_SuiClientTypes` to `SuiClientTypes`
