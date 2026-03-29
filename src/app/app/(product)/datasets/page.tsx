import { PageHeader } from "@/components/layout/page-header";
import { DatasetDirectory } from "@/features/datasets/browser/dataset-directory";
import { loadDatasetDirectoryPage } from "@/features/datasets/browser/server";
import { routes } from "@/lib/routes";

export default async function DatasetsPage() {
  const datasets = await loadDatasetDirectoryPage();

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Browse the datasets your account can already read. Open any dataset to use the shared browser shell."
        route={routes.datasets}
        title="Datasets"
        zone="Product"
      />
      <DatasetDirectory datasets={datasets} />
    </section>
  );
}
