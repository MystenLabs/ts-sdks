# Seal Performance Profiling

## Usage

```bash
cd packages/seal

# e.g. can input different size (1-100 MB)
npx 0x --output-dir=flamegraph-output test/profile.mjs 20

# profile decrypt only
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