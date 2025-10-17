# Seal Performance Profiling

## Usage

```bash
cd packages/seal
npx 0x --output-dir=flamegraph-output test/profile.mjs [size_mb] [mode]

# e.g. can input different size (1-100 MB)
npx 0x --output-dir=flamegraph-output test/profile.mjs 20 encrypt

npx 0x --output-dir=flamegraph-output test/profile.mjs 20 decrypt
```

## View result

```bash
open flamegraph-output/flamegraph.html
```
Bar width = time spent (wider = slower)

## Clean up

```bash
rm -rf flamegraphe-output
```