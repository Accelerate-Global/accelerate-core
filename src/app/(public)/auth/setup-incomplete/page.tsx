import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";

export default function AuthSetupIncompletePage() {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="items-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">
            Account setup incomplete
          </CardTitle>
          <CardDescription className="max-w-md text-base leading-6">
            We verified your sign-in, but we couldn&apos;t finish setting up your
            account. You can&apos;t enter the product until this is resolved.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-sm leading-6 text-muted-foreground">
          If this continues, contact your workspace administrator or support
          for help completing your access.
        </div>
      </CardContent>
      <CardFooter className="justify-center pt-0">
        <form action={signOut}>
          <Button type="submit">Back to sign in</Button>
        </form>
      </CardFooter>
    </Card>
  );
}
