import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/empty-state";

interface AccessDeniedStateProps {
  action?: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}

export const AccessDeniedState = ({
  action,
  className,
  description = "You do not have access to this area yet. If this seems wrong, contact your workspace administrator.",
  title = "Access denied",
}: AccessDeniedStateProps) => {
  return (
    <EmptyState
      action={action}
      className={className}
      description={description}
      icon={<ShieldAlert aria-hidden="true" className="size-5" />}
      title={title}
    />
  );
};
