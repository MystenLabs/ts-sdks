import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { OwnedObjects } from "./OwnedObjects";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Wallet, CheckCircle2 } from "lucide-react";

export function WalletStatus() {
  const account = useCurrentAccount();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Status
          </CardTitle>
          <CardDescription>
            {account
              ? "Your wallet is connected"
              : "Connect your wallet to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {account ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-mono text-sm break-all">
                {account.address}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Click the connect button above to link your Sui wallet.
            </p>
          )}
        </CardContent>
      </Card>

      <OwnedObjects />
    </div>
  );
}
