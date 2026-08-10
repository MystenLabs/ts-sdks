---
'@mysten/codegen': minor
---

Add a `bcsOverrides` package option that replaces generated BCS types with custom ones (for
example, types with `transform`s). Entries replace a datatype's generated declaration everywhere it
is referenced, or replace pure types at field sites matched by a `module::Type.field` glob pattern
with an exact field-type filter. Replacement sources are imported from paths resolved relative to
the config file (or bare package specifiers).
