// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSignTransaction,
  useSuiClientContext,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  verifyPersonalMessageSignature,
  verifyTransactionSignature,
} from "@mysten/sui/verify";
import { Button, Container } from "@radix-ui/themes";
import { fromBase64 } from "@mysten/sui/utils";
import type {
  SuiChain,
  WalletAccount,
  WalletWithRequiredFeatures,
} from "@mysten/wallet-standard";
import { signAndExecuteTransaction as signAndExecuteTransactionWalletStandard } from "@mysten/wallet-standard";
import { useMutation } from "@tanstack/react-query";

export function Actions() {
  const account = useCurrentAccount();
  const signMessage = useSignPersonalMessage();
  const signTransaction = useSignTransaction();
  const signAndExecuteTransaction = useSignAndExecuteTransaction();
  const { network, client } = useSuiClientContext();
  const { currentWallet } = useCurrentWallet();
  const signAndExecuteTransactionForceInWallet = useMutation({
    mutationFn: ({
      transaction,
      account,
      chain,
      wallet,
    }: {
      transaction: Transaction;
      account: WalletAccount;
      chain: SuiChain;
      wallet: WalletWithRequiredFeatures;
    }) => {
      return signAndExecuteTransactionWalletStandard(wallet, {
        transaction,
        account,
        chain,
      });
    },
  });

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
            chain: `sui:${network}`,
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
          const transaction = new Transaction();
          const [coin] = transaction.splitCoins(transaction.gas, [1]);

          transaction.transferObjects([coin], account.address);
          transaction.setSender(account.address);

          const { signature, bytes } = await signTransaction.mutateAsync({
            transaction,
            account,
            chain: `sui:${network}`,
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

          const { digest } = await signAndExecuteTransaction.mutateAsync({
            transaction,
            account,
            chain: `sui:${network}`,
          });
          console.log("Transaction digest:", digest);
        }}
        mr="2"
      >
        Sign & Execute Transaction
      </Button>
      <Button
        onClick={async () => {
          if (!currentWallet) {
            throw new Error("No wallet connected");
          }

          const transaction = new Transaction();
          const [coin] = transaction.splitCoins(transaction.gas, [1]);

          transaction.transferObjects([coin], account.address);
          transaction.setSender(account.address);
          const { digest } =
            await signAndExecuteTransactionForceInWallet.mutateAsync({
              transaction,
              account,
              chain: `sui:${network}` as SuiChain,
              wallet: currentWallet,
            });
          console.log("Transaction digest:", digest);
        }}
      >
        Sign & force Wallet Execute Transaction
      </Button>
    </Container>
  );
}
