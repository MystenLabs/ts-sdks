// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  useCurrentAccount,
  useSignPersonalMessage,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  verifyPersonalMessageSignature,
  verifyTransactionSignature,
} from "@mysten/sui/verify";
import { Button, Container } from "@radix-ui/themes";
import { fromBase64 } from "@mysten/sui/utils";

export function Actions() {
  const account = useCurrentAccount();
  const signMessage = useSignPersonalMessage();
  const signTransaction = useSignTransaction();

  if (!account) {
    return null;
  }

  return (
    <Container my="4">
      <Button
        onClick={async () => {
          const message = new TextEncoder().encode("Hello, world!");
          const { signature } = await signMessage.mutateAsync({
            message,
            account,
          });
          try {
            await verifyPersonalMessageSignature(message, signature, {
              address: account.address,
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
          const transaction = new Transaction();
          const [coin] = transaction.splitCoins(transaction.gas, [1]);

          transaction.transferObjects([coin], account.address);
          transaction.setSender(account.address);

          const { signature, bytes } = await signTransaction.mutateAsync({
            transaction,
            account,
            chain: "sui:testnet",
          });
          try {
            await verifyTransactionSignature(fromBase64(bytes), signature, {
              address: account.address,
            });
            console.log("Transaction signature verified!");
          } catch (e) {
            console.error(e);
          }
        }}
      >
        Sign Transaction
      </Button>
    </Container>
  );
}
