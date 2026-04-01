import { Database, FileClock, Rows3 } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DatasetSummary } from "@/features/datasets/query-contract";
import { routes } from "@/lib/routes";

import { DatasetContextBadge } from "./dataset-context-badge";

interface DatasetDirectoryProps {
  datasets: DatasetSummary[];
}

const getDatasetVersionSummary = (dataset: DatasetSummary): string => {
  if (dataset.activeVersionId) {
    return "Active version available";
  }

  return "No active version yet";
};

const getDatasetHref = (datasetId: string): string => {
  return routes.datasetDetail.replace("[datasetId]", datasetId);
};

const getWorkspaceSummary = (dataset: DatasetSummary): string | null => {
  if (!dataset.ownerWorkspace) {
    return null;
  }

  if (dataset.accessMode === "workspace") {
    return `Owned by ${dataset.ownerWorkspace.name}`;
  }

  if (dataset.accessMode === "shared") {
    const sharedLabel =
      dataset.sharedWorkspaceCount === 0
        ? "no extra approved workspaces yet"
        : `shared to ${dataset.sharedWorkspaceCount.toLocaleString()} approved ${
            dataset.sharedWorkspaceCount === 1 ? "workspace" : "workspaces"
          }`;

    return `${dataset.ownerWorkspace.name} owner · ${sharedLabel}`;
  }

  return null;
};

const getLineageSummary = (dataset: DatasetSummary): string | null => {
  if (!dataset.lineageSummary.isDerived) {
    return null;
  }

  return `Derived from ${dataset.lineageSummary.sourceCount.toLocaleString()} ${
    dataset.lineageSummary.sourceCount === 1
      ? "source version"
      : "source versions"
  }`;
};

export const DatasetDirectory = ({ datasets }: DatasetDirectoryProps) => {
  if (datasets.length === 0) {
    return (
      <EmptyState
        description="No datasets are readable for this account yet. Once access is granted, they will appear here."
        icon={<Database aria-hidden="true" className="size-5" />}
        title="No datasets available"
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {datasets.map((dataset) => (
        <Card
          className="border-border/80 shadow-sm transition-colors hover:border-border"
          key={dataset.id}
        >
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-xl">{dataset.name}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  Dataset ID:{" "}
                  <span className="font-mono text-xs">{dataset.id}</span>
                </CardDescription>
              </div>
            </div>
            <DatasetContextBadge dataset={dataset} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileClock aria-hidden="true" className="size-4" />
              <span>{getDatasetVersionSummary(dataset)}</span>
            </div>
            {getWorkspaceSummary(dataset) ? (
              <p className="text-muted-foreground">
                {getWorkspaceSummary(dataset)}
              </p>
            ) : null}
            {getLineageSummary(dataset) ? (
              <p className="text-muted-foreground">
                {getLineageSummary(dataset)}
              </p>
            ) : null}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Rows3 aria-hidden="true" className="size-4" />
              <span>
                {dataset.rowCount.toLocaleString()}{" "}
                {dataset.rowCount === 1 ? "row" : "rows"}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href={getDatasetHref(dataset.id)}>Open dataset</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
