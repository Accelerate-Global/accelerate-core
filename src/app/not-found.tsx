import { FileSearch } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <EmptyState
        action={
          <Button asChild>
            <Link href={routes.login}>Go to login</Link>
          </Button>
        }
        description="The page you requested does not exist or has moved. Start again from the login flow."
        icon={<FileSearch aria-hidden="true" className="size-5" />}
        title="Page not found"
      />
    </main>
  );
}
