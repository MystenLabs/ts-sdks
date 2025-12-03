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

  async function create() {
    setIsPending(true);

    const tx = new Transaction();

    tx.add(createCounter());

    try {
      const { digest } = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
      });

      const { transaction } = await client.waitForTransaction({
        digest: digest,
        include: {
          effects: true,
        },
      });

      // Find the created object from the effects
      const createdObject = transaction.effects?.changedObjects?.find(
        (obj) => obj.idOperation === "Created",
      );

      const id = createdObject?.objectId;

      if (!id) {
        throw new Error("Counter object ID not found in transaction effects");
      }

      onCreated(id);
    } catch (err) {
      console.error(err);
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
