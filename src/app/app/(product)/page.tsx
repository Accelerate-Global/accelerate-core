import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DatasetBrowserShell } from "@/features/datasets/browser/dataset-browser-shell";
import {
  DatasetAccessDeniedState,
  DatasetStatusState,
} from "@/features/datasets/browser/dataset-empty-state";
import { loadDatasetHomePage } from "@/features/datasets/browser/server";
import { routes } from "@/lib/routes";

interface AppHomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const resolvedSearchParams = await searchParams;
  const pageState = await loadDatasetHomePage(resolvedSearchParams);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {pageState.status === "ready" ? null : (
        <PageHeader
          description="Authenticated landing page for the main global dataset experience."
          route={routes.appHome}
          title="Home"
          zone="Product"
        />
      )}
      {pageState.status === "ready" ? (
        <DatasetBrowserShell
          datasetId={pageState.metadata.dataset.id}
          initialQuery={pageState.initialQuery}
          initialSearchState={pageState.initialSearchState}
          isHomePage
          metadata={pageState.metadata}
          stateKey={pageState.stateKey}
        />
      ) : null}
      {pageState.status === "empty-home" ? (
        <DatasetStatusState
          action={
            <Button asChild>
              <Link href={routes.datasets}>Open dataset directory</Link>
            </Button>
          }
          description="No readable home dataset is configured yet. An administrator may need to publish or mark the main global dataset first."
          title="Home dataset not configured"
        />
      ) : null}
      {pageState.status === "access-denied" ? (
        <DatasetAccessDeniedState
          action={
            <Button asChild variant="outline">
              <Link href={routes.datasets}>Browse other datasets</Link>
            </Button>
          }
        />
      ) : null}
      {pageState.status === "not-found" ? (
        <DatasetStatusState
          action={
            <Button asChild variant="outline">
              <Link href={routes.datasets}>Open dataset directory</Link>
            </Button>
          }
          description="The configured home dataset could not be found."
          title="Home dataset unavailable"
        />
      ) : null}
      {pageState.status === "unavailable" ? (
        <DatasetStatusState
          action={
            <Button asChild variant="outline">
              <Link href={routes.datasets}>Open dataset directory</Link>
            </Button>
          }
          description={pageState.message}
          title="Home dataset unavailable"
        />
      ) : null}
    </section>
  );
}
