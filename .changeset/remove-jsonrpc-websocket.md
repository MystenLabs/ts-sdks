---
'@mysten/sui': minor
---

Remove WebSocket client and streaming subscription APIs from the JSON-RPC transport. The `subscribe` method, `WebSocketConstructor` option, `websocket` option, `JsonRpcTransportSubscribeOptions` type, and `Unsubscribe` type have been removed from the public API.
