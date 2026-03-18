import { FileSearch } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function ProductNotFound() {
  return (
    <EmptyState
      action={
        <Button asChild>
          <Link href={routes.appHome}>Back to app home</Link>
        </Button>
      }
      description="This app page is not available. Return to the product home area and choose another route."
      icon={<FileSearch aria-hidden="true" className="size-5" />}
      title="Page not found"
    />
  );
}
