import {
  useCurrentAccount,
  useCurrentClient,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
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
  const queryClient = useQueryClient();

  // Fetch counter object with React Query
  const { data, isPending, error } = useQuery({
    queryKey: ["counter", id],
    queryFn: async () => {
      const { response } = await client.ledgerService.getObject({
        objectId: id,
        readMask: {
          paths: ["*"],
        },
      });
      return response.object ?? null;
    },
  });

  // Mutation for executing move calls
  const incrementMutation = useMutation({
    mutationFn: async () => {
      const tx = new Transaction();
      tx.add(increment({ arguments: { counter: id } }));

      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
      });

      if (result.$kind === "FailedTransaction") {
        throw new Error("Transaction failed");
      }

      await client.waitForTransaction({ digest: result.Transaction.digest });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counter", id] });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const tx = new Transaction();
      tx.add(setValue({ arguments: { counter: id, value: 0 } }));

      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
      });

      if (result.$kind === "FailedTransaction") {
        throw new Error("Transaction failed");
      }

      await client.waitForTransaction({ digest: result.Transaction.digest });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counter", id] });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const isAnyMutationPending =
    incrementMutation.isPending || resetMutation.isPending;

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
          <p className="text-destructive-foreground">
            Error: {(error as Error)?.message || "Unknown error"}
          </p>
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
            onClick={() => incrementMutation.mutate()}
            loading={incrementMutation.isPending}
            disabled={isAnyMutationPending}
          >
            <Plus className="h-4 w-4" />
            Increment
          </Button>
          {ownedByCurrentAccount && (
            <Button
              variant="secondary"
              onClick={() => resetMutation.mutate()}
              loading={resetMutation.isPending}
              disabled={isAnyMutationPending}
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
