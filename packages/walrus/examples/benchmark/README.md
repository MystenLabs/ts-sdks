# Walrus Benchmark Example

This example demonstrates how to benchmark blob upload performance in Walrus using the `writeBlobFlow` method.

## Setup

1. Set up a funded keypair (see `../funded-keypair.ts`)

2. (Optional) Set environment variables:
   - `WALRUS_UPLOAD_RELAY_URL`: URL for the upload relay (defaults to testnet upload relay)

## Usage

Run the benchmark with default settings (1 run, 1MB blob, upload relay):
```bash
pnpm benchmark
```

### Command Line Options

- `--runs <number>`: Number of benchmark runs (default: 1)
- `--size <size>`: Size of blob to upload (e.g., 1024, 1KB, 1MB) (default: 1MB)
- `--no-relay`: Use direct node upload instead of upload relay
- `--epochs <number>`: Number of epochs to store the blob (default: 5)
- `--help`: Show help message

### Examples

Benchmark with 10 runs of 5MB blobs:
```bash
pnpm benchmark --runs 10 --size 5MB
```

Benchmark using direct node upload:
```bash
pnpm benchmark --no-relay --size 10MB
```

Benchmark small blobs (100KB) with 20 runs:
```bash
pnpm benchmark --runs 20 --size 100KB
```

## Output

The benchmark will output:
- Individual run results showing encode, register, upload, and certify times
- Average times across all runs
- Overall throughput in bytes per second

## How it Works

The benchmark uses the `writeBlobFlow` method to break down the blob upload process into distinct steps:

1. **Encode**: Encode the blob into slivers
2. **Register**: Register the blob on-chain
3. **Upload**: Upload slivers to storage nodes (or upload relay)
4. **Certify**: Certify the blob on-chain

This allows for fine-grained performance measurement of each step in the upload process.