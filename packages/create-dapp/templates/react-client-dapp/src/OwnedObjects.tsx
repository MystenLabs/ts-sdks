import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Package, Loader2 } from "lucide-react";

export function OwnedObjects() {
  const account = useCurrentAccount();
  const client = useCurrentClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["ownedObjects", account?.address],
    queryFn: async () => {
      if (!account) return null;

      const { response } = await client.stateService.listOwnedObjects({
        owner: account.address,
      });
      return response.objects ?? [];
    },
    enabled: !!account,
  });

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
          <p className="text-destructive-foreground">
            Error: {(error as Error)?.message || "Unknown error"}
          </p>
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
