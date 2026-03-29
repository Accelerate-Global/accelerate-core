import { ArrowLeft, Database } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type {
  DatasetMetadataResponse,
  DatasetQueryResponse,
} from "@/features/datasets/query-contract";
import { routes } from "@/lib/routes";

import { DatasetContextBadge } from "./dataset-context-badge";

interface DatasetHeaderProps {
  activeFilterCount: number;
  isHomePage?: boolean;
  metadata: DatasetMetadataResponse;
  query: DatasetQueryResponse;
}

const formatRowCountLabel = (value: number): string => {
  return `${value.toLocaleString()} ${value === 1 ? "row" : "rows"}`;
};

export const DatasetHeader = ({
  activeFilterCount,
  isHomePage = false,
  metadata,
  query,
}: DatasetHeaderProps) => {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isHomePage ? null : (
              <Button asChild size="sm" variant="ghost">
                <Link href={routes.datasets}>
                  <ArrowLeft aria-hidden="true" />
                  All datasets
                </Link>
              </Button>
            )}
            <DatasetContextBadge dataset={metadata.dataset} />
          </div>
          <div className="space-y-2">
            <h1 className="font-semibold text-3xl tracking-tight">
              {metadata.dataset.name}
            </h1>
            <p className="max-w-3xl text-muted-foreground text-sm leading-6">
              Active version {metadata.version.versionNumber} with{" "}
              {formatRowCountLabel(metadata.version.rowCount)}.
              {activeFilterCount > 0
                ? ` ${query.totalRows.toLocaleString()} matching results after filters.`
                : ` ${query.totalRows.toLocaleString()} readable results available.`}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Database
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            Dataset overview
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between gap-6">
              <dt className="text-muted-foreground">Version ID</dt>
              <dd className="font-mono text-xs">{metadata.version.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-6">
              <dt className="text-muted-foreground">Filtered rows</dt>
              <dd className="font-medium">
                {formatRowCountLabel(query.totalRows)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </header>
  );
};
