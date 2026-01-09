import { Transaction } from "@mysten/sui/transactions";
import { useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { useState } from "react";
import { create as createCounter } from "./contracts/counter/counter";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { PlusCircle } from "lucide-react";

export function CreateCounter({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setIsPending(true);
    setError(null);

    const tx = new Transaction();

    tx.add(createCounter());

    try {
      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
      });

      if (result.$kind === "FailedTransaction") {
        throw new Error("Transaction failed");
      }

      const txResult = await client.waitForTransaction({
        digest: result.Transaction.digest,
        include: {
          effects: true,
        },
      });

      if (txResult.$kind === "FailedTransaction") {
        throw new Error("Transaction failed");
      }

      // Find the created object from the effects
      const createdObject = txResult.Transaction.effects?.changedObjects?.find(
        (obj: { idOperation?: string; objectId?: string }) =>
          obj.idOperation === "Created",
      );

      const id = createdObject?.objectId;

      if (!id) {
        throw new Error("Counter object ID not found in transaction effects");
      }

      onCreated(id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          Create Counter
        </CardTitle>
        <CardDescription>
          Deploy a new counter object on the Sui blockchain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}
        <Button
          size="lg"
          className="w-full"
          onClick={create}
          loading={isPending}
        >
          Create Counter
        </Button>
      </CardContent>
    </Card>
  );
}
