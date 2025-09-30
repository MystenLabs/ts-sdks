---
'@mysten/seal': patch
---

Fix generation of random BLS scalars which would fail, and likely cause encryption to fail, for some versions of the @noble/curves dependency.
