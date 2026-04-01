import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutFromSetupIncompleteAction } from "@/features/auth/actions";
import { routes } from "@/lib/routes";

export default function AuthSetupIncompletePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account setup incomplete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Sign-in succeeded, but we could not finish your account setup. This
          can happen when invite/profile finalization fails.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={routes.login}>Retry login</Link>
          </Button>
          <form action={signOutFromSetupIncompleteAction}>
            <Button type="submit" variant="destructive">
              Sign out
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
