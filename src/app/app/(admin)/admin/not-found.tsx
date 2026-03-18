import { FileSearch } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function AdminNotFound() {
  return (
    <EmptyState
      action={
        <Button asChild>
          <Link href={routes.adminHome}>Back to admin overview</Link>
        </Button>
      }
      description="This admin page does not exist. Return to the admin overview and pick another destination."
      icon={<FileSearch aria-hidden="true" className="size-5" />}
      title="Admin page not found"
    />
  );
}
