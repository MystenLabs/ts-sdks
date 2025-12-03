import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Package, Loader2 } from "lucide-react";

interface OwnedObject {
  objectId?: string;
  version?: bigint;
  digest?: string;
}

export function OwnedObjects() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [data, setData] = useState<OwnedObject[] | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      setData(null);
      setIsPending(false);
      return;
    }

    async function fetchObjects() {
      setIsPending(true);
      setError(null);
      try {
        const { response } = await client.stateService.listOwnedObjects({
          owner: account!.address,
        });
        setData(response.objects ?? []);
      } catch (err) {
        setError((err as Error)?.message || "Unknown error");
      } finally {
        setIsPending(false);
      }
    }

    fetchObjects();
  }, [account, client]);

  if (!account) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Owned Objects
        </CardTitle>
        <CardDescription>Objects owned by the connected wallet</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive-foreground">Error: {error}</p>
        ) : isPending || !data ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading objects...
          </div>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">No objects found</p>
        ) : (
          <div className="space-y-2">
            {data.map((object) => (
              <div
                key={object.objectId}
                className="rounded-md border bg-muted/50 p-3"
              >
                <p className="font-mono text-xs break-all">{object.objectId}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
