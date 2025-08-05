# Walrus Write from Wallet Example

This example demonstrates how to use the Walrus SDK to upload files from a wallet.

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

4. Connect your wallet and upload a file!

## What it does

- Allows you to select a file from your device
- Encodes the file using Walrus
- Registers the blob on-chain
- Uploads the file to storage nodes
- Certifies the upload
- Displays the file IDs when complete
