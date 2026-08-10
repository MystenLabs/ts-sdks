---
'@mysten/deepbook-predict': patch
---

Regenerate the Move bindings. `AccumulatorRoot` is now auto-injected by the generated code, so
call sites no longer pass `root` explicitly (the argument is still sent — the generated layer
supplies it). Also drops three stale `propbook` feed modules whose Move sources no longer exist,
and picks up four new `protocol_config` admin setters.
