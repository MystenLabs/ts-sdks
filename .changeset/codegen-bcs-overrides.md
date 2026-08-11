---
'@mysten/codegen': minor
---

Add a `bcsOverrides` package option that replaces generated BCS types with custom ones (for example,
types with `transform`s). Each entry names the Move `type` it replaces and the `source` module the
replacement is imported from, optionally narrowed to specific `fields`. A datatype codegen emits a
declaration for has that declaration replaced, so every use picks it up; everything else is
substituted wherever the type is rendered, at any depth (an override on `u64` also replaces the
`u64` inside `vector<u64>` and `Option<u64>`). `fields` is a glob matched against
`module::Type.field` (or `module::Type.variant.field`) where `*` matches any run of characters, and
a glob that names no module applies in every module. Entries are tried in declaration order and the
first match wins. Replacement sources are imported from paths resolved relative to the config file
(or bare package specifiers), with an optional `#ExportName` fragment.
