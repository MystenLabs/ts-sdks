// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  useCurrentAccount,
  useCurrentClient,
  useCurrentNetwork,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import {
  verifyPersonalMessageSignature,
  verifyTransactionSignature,
} from "@mysten/sui/verify";
import { Button, Container } from "@radix-ui/themes";
import { fromBase64 } from "@mysten/sui/utils";

export function Actions() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const network = useCurrentNetwork();
  const dAppKit = useDAppKit();

  if (!account) {
    return null;
  }

  return (
    <Container my="4">
      <Button
        onClick={async () => {
          const message = new TextEncoder().encode("Hello, world!");
          const { signature } = await dAppKit.signPersonalMessage({
            message,
            account,
            network,
          });
          try {
            await verifyPersonalMessageSignature(message, signature, {
              address: account.address,
              client,
            });
            console.log("Personal message signature verified!");
          } catch (e) {
            console.error(e);
          }
        }}
        mr="2"
      >
        Sign Message
      </Button>
      <Button
        onClick={async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const message = new TextEncoder().encode("Hello, world!");
          const { signature } = await dAppKit.signPersonalMessage({
            message,
            account,
            network,
          });
          try {
            await verifyPersonalMessageSignature(message, signature, {
              address: account.address,
              client,
            });
            console.log("Personal message signature verified!");
          } catch (e) {
            console.error(e);
          }
        }}
        mr="2"
      >
        Simulate async work and Sign Message
      </Button>
      <Button
        onClick={async () => {
          const transaction = new Transaction();
          const [coin] = transaction.splitCoins(transaction.gas, [1]);

          transaction.transferObjects([coin], account.address);
          transaction.setSender(account.address);

          const { signature, bytes } = await dAppKit.signTransaction({
            transaction,
            account,
            network,
          });
          try {
            await verifyTransactionSignature(fromBase64(bytes), signature, {
              address: account.address,
              client,
            });
            console.log("Transaction signature verified!");
          } catch (e) {
            console.error(e);
          }
        }}
        mr="2"
      >
        Sign Transaction
      </Button>
      <Button
        onClick={async () => {
          const transaction = new Transaction();
          const [coin] = transaction.splitCoins(transaction.gas, [1]);

          transaction.transferObjects([coin], account.address);
          transaction.setSender(account.address);

          const result = await dAppKit.signAndExecuteTransaction({
            transaction,
            account,
            network,
          });
          const digest =
            result.$kind === "Transaction"
              ? result.Transaction.digest
              : result.FailedTransaction.digest;
          console.log("Transaction digest:", digest);
        }}
        mr="2"
      >
        Sign & Execute Transaction
      </Button>
    </Container>
  );
}
