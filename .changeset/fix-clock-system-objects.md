---
"@mysten/sui": patch
---

Fix system objects to avoid unnecessary network calls

- Clock (0x6) and Random (0x8) now return fully resolved SharedObject references with mutable: false
- System (0x5) and DenyList (0x403) now accept optional `mutable` parameter:
  - System defaults to mutable: true (returns SharedObject)
  - DenyList defaults to mutable: false (returns UnresolvedObject with initialSharedVersion)
  - When mutable is explicitly set, returns appropriate object type
- All system objects include initialSharedVersion to avoid network lookups
- Improves transaction building performance by avoiding object resolution

Fixes #424