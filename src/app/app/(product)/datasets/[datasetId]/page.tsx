import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DatasetBrowserShell } from "@/features/datasets/browser/dataset-browser-shell";
import {
  DatasetAccessDeniedState,
  DatasetStatusState,
} from "@/features/datasets/browser/dataset-empty-state";
import { loadDatasetDetailPage } from "@/features/datasets/browser/server";
import { routes } from "@/lib/routes";

interface DatasetDetailPageProps {
  params: Promise<{
    datasetId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DatasetDetailPage({
  params,
  searchParams,
}: DatasetDetailPageProps) {
  const { datasetId } = await params;
  const resolvedSearchParams = await searchParams;
  const pageState = await loadDatasetDetailPage(
    datasetId,
    resolvedSearchParams
  );

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {pageState.status === "ready" ? null : (
        <PageHeader
          description="Reusable dataset browser for global, private, workspace, and shared datasets."
          route={routes.datasetDetail.replace("[datasetId]", datasetId)}
          title="Dataset"
          zone="Product"
        />
      )}
      {pageState.status === "ready" ? (
        <DatasetBrowserShell
          datasetId={pageState.metadata.dataset.id}
          initialQuery={pageState.initialQuery}
          initialSearchState={pageState.initialSearchState}
          metadata={pageState.metadata}
          stateKey={pageState.stateKey}
        />
      ) : null}
      {pageState.status === "access-denied" ? (
        <DatasetAccessDeniedState
          action={
            <Button asChild variant="outline">
              <Link href={routes.datasets}>Back to datasets</Link>
            </Button>
          }
        />
      ) : null}
      {pageState.status === "not-found" ? (
        <DatasetStatusState
          action={
            <Button asChild variant="outline">
              <Link href={routes.datasets}>Back to datasets</Link>
            </Button>
          }
          description="This dataset could not be found. Check the link or open another dataset from the directory."
          title="Dataset not found"
        />
      ) : null}
      {pageState.status === "unavailable" ? (
        <DatasetStatusState
          action={
            <Button asChild variant="outline">
              <Link href={routes.datasets}>Back to datasets</Link>
            </Button>
          }
          description={pageState.message}
          title="Dataset unavailable"
        />
      ) : null}
    </section>
  );
}
