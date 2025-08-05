# Walrus Write from Wallet Example

This example demonstrates how to use the Walrus SDK to upload files from a web app using a connected wallet. It includes two features:

1. **File Upload**: Upload files to Walrus using the `writeFilesFlow` method
2. **Benchmark**: Run performance benchmarks with different blob sizes and upload methods

## Features

### File Upload Page
- Connect your wallet
- Select a file to upload
- Upload is broken down into steps: encode, register, upload, and certify
- Shows the resulting file IDs upon completion

### Benchmark Page
- Configure benchmark settings:
  - Blob size (100KB to 10MB)
  - Upload method (Upload Relay or Direct to Nodes)
  - Storage epochs
- Run benchmarks and see detailed timing for each step
- Compare results across different settings in a table
- Results show:
  - Encode time
  - Register time (on-chain transaction)
  - Upload time (to storage nodes or relay)  
  - Certify time (on-chain transaction)
  - Total time

## Running the Example

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the development server:

   ```bash
   pnpm dev:write-from-wallet
   ```

3. Open your browser to `http://localhost:5173`

4. Connect your wallet and try both the upload and benchmark features!

## What it does

### File Upload
- Allows you to select a file from your device
- Encodes the file using Walrus
- Registers the blob on-chain
- Uploads the file to storage nodes or upload relay
- Certifies the upload
- Displays the file IDs when complete

### Benchmark
- Creates zero-filled blobs with unique headers to prevent caching
- Measures performance of each step in the upload process
- Allows comparison of different configurations
- Helps identify performance bottlenecks