import { DatabaseZap, FolderSearch } from "lucide-react";
import type { ReactNode } from "react";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";

interface DatasetEmptyStateProps {
  action?: ReactNode;
  description?: string;
  title?: string;
}

export const DatasetEmptyState = ({
  action,
  description = "This dataset does not have any rows yet. Once data is published into the active version, it will appear here.",
  title = "No rows yet",
}: DatasetEmptyStateProps) => {
  return (
    <EmptyState
      action={action}
      description={description}
      icon={<DatabaseZap aria-hidden="true" className="size-5" />}
      title={title}
    />
  );
};

interface DatasetAccessDeniedStateProps {
  action?: ReactNode;
  description?: string;
}

export const DatasetAccessDeniedState = ({
  action,
  description = "You are authenticated, but this dataset is not shared with your account or workspace.",
}: DatasetAccessDeniedStateProps) => {
  return <AccessDeniedState action={action} description={description} />;
};

interface DatasetStatusStateProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export const DatasetStatusState = ({
  action,
  description,
  title,
}: DatasetStatusStateProps) => {
  return (
    <EmptyState
      action={action}
      description={description}
      icon={<FolderSearch aria-hidden="true" className="size-5" />}
      title={title}
    />
  );
};
