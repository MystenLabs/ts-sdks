---
'@mysten/seal': minor
---

Add an optional `fetch` option to `SealClient`, used for all key server requests. This lets callers customize how requests are sent — e.g. send cookies with `credentials: 'include'` or attach your own headers — mirroring the `fetch` option of `SuiHTTPTransport`.
