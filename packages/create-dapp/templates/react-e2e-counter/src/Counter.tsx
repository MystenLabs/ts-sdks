import {
  useCurrentAccount,
  useCurrentClient,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useEffect, useCallback } from "react";
import {
  Counter as CounterStruct,
  increment,
  setValue,
} from "./contracts/counter/counter";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Plus, RotateCcw } from "lucide-react";

interface SuiObject {
  objectId?: string;
  version?: bigint;
  digest?: string;
  owner?: { kind?: number; address?: string };
  contents?: { value?: Uint8Array };
}

export function Counter({ id }: { id: string }) {
  const client = useCurrentClient();
  const currentAccount = useCurrentAccount();
  const dAppKit = useDAppKit();

  const [data, setData] = useState<SuiObject | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingForTxn, setWaitingForTxn] = useState("");

  const fetchObject = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      const { response } = await client.ledgerService.getObject({
        objectId: id,
        readMask: {
          paths: ["*"],
        },
      });
      setData(response.object ?? null);
    } catch (err) {
      setError((err as Error)?.message || "Unknown error");
    } finally {
      setIsPending(false);
    }
  }, [client, id]);

  useEffect(() => {
    fetchObject();
  }, [fetchObject]);

  const executeMoveCall = async (method: "increment" | "reset") => {
    setWaitingForTxn(method);

    const tx = new Transaction();

    if (method === "reset") {
      tx.add(
        setValue({
          arguments: { counter: id, value: 0 },
        }),
      );
    } else {
      tx.add(
        increment({
          arguments: { counter: id },
        }),
      );
    }

    try {
      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
      });
      await client.waitForTransaction({ digest: result.digest });
      await fetchObject();
    } catch (err) {
      console.error(err);
    } finally {
      setWaitingForTxn("");
    }
  };

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive-foreground">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground">Counter not found</p>
        </CardContent>
      </Card>
    );
  }

  const fields = getCounterFields(data);
  const ownedByCurrentAccount = fields?.owner === currentAccount?.address;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Counter</CardTitle>
        <CardDescription className="font-mono text-xs break-all">
          {id}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <span className="text-6xl font-bold tabular-nums">
            {fields?.value ?? 0}
          </span>
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => executeMoveCall("increment")}
            loading={waitingForTxn === "increment"}
            disabled={waitingForTxn !== ""}
          >
            <Plus className="h-4 w-4" />
            Increment
          </Button>
          {ownedByCurrentAccount && (
            <Button
              variant="secondary"
              onClick={() => executeMoveCall("reset")}
              loading={waitingForTxn === "reset"}
              disabled={waitingForTxn !== ""}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getCounterFields(data: SuiObject) {
  if (!data.contents?.value) {
    return null;
  }

  try {
    const parsed = CounterStruct.parse(data.contents.value);
    return { value: Number(parsed.value), owner: parsed.owner };
  } catch {
    return null;
  }
}
