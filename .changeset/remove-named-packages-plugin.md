---
'@mysten/sui': major
---

Remove named-packages plugin and global plugin registry APIs. MVR resolution is now built directly into the transaction resolution process, making the plugin-based approach obsolete.

**Removed from @mysten/sui:**

- `namedPackagesPlugin` function
- `NamedPackagesPluginOptions` type
- `Transaction.registerGlobalSerializationPlugin()` static method
- `Transaction.unregisterGlobalSerializationPlugin()` static method
- `Transaction.registerGlobalBuildPlugin()` static method
- `Transaction.unregisterGlobalBuildPlugin()` static method
- Global plugin registry system

**Changed:**

- MVR name resolution (`.move` names) now happens automatically during transaction building for all clients (JSON-RPC and gRPC)
- No manual plugin registration is required - MVR resolution is integrated into the standard transaction resolution flow
