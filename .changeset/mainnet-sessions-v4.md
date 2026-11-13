---
'@mysten/deepbook-v3': minor
---

Point Mainnet at Sessions v4 `0x6069298c…`. `sessionsPackageIdV1` keeps the original id
`0x9a068bef…`, so the `SessionsApp` key and the v1 session events keep their type tags. Sessions v4
adds the spot pool allowlist (`session_config::allowed_pools`, `admin_allow_pool`,
`admin_disallow_pool`) and session builder approvals, whose bindings already ship.

Session-key spot orders (`place_limit_order`, `place_market_order`) through Sessions v4 abort with
`EPoolNotAllowed` (code 2) on a pool outside the allowlist, and Mainnet's allowlist is empty until
the admin fills it. The same admin transaction raises the Sessions version watermark to 4, which
retires Sessions v1 to v3. Apps with one-click spot trading should switch to this release when that
transaction executes. Session Predict orders and cancels aren't gated by the allowlist.
