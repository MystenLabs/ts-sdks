# Dev Wallet Progress Tracker

## Status: All Review Issues Resolved

- **Build**: Passes
- **Tests**: 252 pass (204 node + 48 browser) across 11 test files
- **Demo**: Verified at http://localhost:5173/

---

## Package Overview

- **Core**: `SignerAdapter` interface, `DevWallet` (wallet-standard compliant, request queue signing)
- **Adapters**: InMemory (browser), WebCrypto/IndexedDB (browser), Keystore (node), SuiCli (node),
  RemoteCliAdapter (browser-to-CLI proxy)
- **UI**: 7 Lit Web Components (panel, signing-modal, signing, accounts, balances, new-account,
  mount), OKLch dark theme
- **React**: `useDevWallet` hook, `DevWalletProvider`, React-wrapped Lit components via `@lit/react`
- **Client/Server**: `DevWalletClient` (PostMessage popups), `parseWalletRequest` (server-side)
- **CLI**: `npx @mysten/dev-wallet serve` with `--port`
- **Auto-approval**: `autoApprove: true | (request) => boolean` policy
- **Demo app**: `examples/demo/` — dapp-kit-react based, Tailwind v4,
  Transfer/SignMessage/Transaction demos

---

## Resolved Issues

### Issues #1–#11 (Phases 1–9)

| #  | Description | Resolution |
|----|-------------|------------|
| 1  | Duplicate drawers from React Strict Mode | `cancelled` flag pattern |
| 2  | `borderBottomColor` conflicts with shorthand | Longhand properties |
| 3  | Messages-only mode queues transactions with no UI | Demo rebuilt |
| 4  | "Drawer" component misnomer | Renamed to `dev-wallet-panel` |
| 5  | Signing UI shows raw bytes | Transaction analyzer added |
| 6  | UI layout pattern | Sidebar for management, modal for signing |
| 7  | Demo should use dapp-kit | Rebuilt with dapp-kit-react |
| 8  | White border styling | Rebuilt with Tailwind |
| 9  | Styling system mismatch | OKLch custom properties |
| 10 | `satisfies ManagedAccount` type narrowing | Annotated `.map` return type |
| 11 | `adapter` vs `adapters` in demo | Fixed to `adapters: [adapter]` |

### Issues #12–#29 (Phase 8 Review)

| #  | Description | Resolution |
|----|-------------|------------|
| 12 | Sidebar doesn't reopen after signing | Track `#wasOpenBeforeRequest`, restore on completion |
| 13 | Client selection ignores request chain | Read chain from pending request first |
| 14 | Chain row shown for personal messages | Hide chain row for `sign-personal-message` |
| 15 | Balances don't refresh after signing | `refresh()` method, triggered after request completion |
| 16 | No Escape key on signing modal | `keydown` listener on `connectedCallback` |
| 17 | Non-SUI tokens show 0 decimals | `KNOWN_DECIMALS` map (USDC=6, USDT=6, WETH=8) |
| 18 | Single-pending-request undocumented | Added comment documenting the limitation |
| 19 | `mountUI()` race condition | Made async, awaits dynamic import |
| 20 | `useDevWallet` swallows init errors | Returns `{ wallet, error }` via `UseDevWalletResult` |
| 21 | Empty string for missing effects BCS | Returns `undefined`; request-handler normalizes to `''` at boundary |
| 22 | Coin flow `-` prefix hardcoded | Added comment documenting outflow-only assumption |
| 23 | JWT secret in localStorage | Added security comment |
| 24 | Duplicate radius tokens (xs = sm) | Differentiated: xs = `radius - 6px`, sm = `radius - 4px` |
| 25 | Lit update cycle warning | Changed `updated()` to `willUpdate()` in panel, balances, signing |
| 26 | Demo float precision in Transfer | `suiToMist()` parses string to BigInt directly |
| 27 | Demo duplicated gRPC URLs | Single export from `dApp-kit.ts` |
| 28 | Demo `splitCoins(tx.gas, [0])` | Changed to `[1_000_000]` (0.001 SUI) |
| 29 | Demo generic error messages | Shared `formatWalletError()` helper with categorized messages |

---

## Architecture

### UI Components

- `<dev-wallet-panel>` — FAB button + sidebar popover for accounts/balances management
- `<dev-wallet-signing-modal>` — Centered modal overlay for signing request approval
- `<dev-wallet-signing>` — Signing request details with transaction analyzer integration
- `<dev-wallet-accounts>` — Account list with selection and creation
- `<dev-wallet-balances>` — Coin balance display
- `<dev-wallet-new-account>` — Dialog for creating new accounts

### Dependencies Added

- `@mysten/wallet-sdk` — transaction analyzer for signing UI
