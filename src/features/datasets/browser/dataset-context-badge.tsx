import { Globe2, House, Lock, Share2, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  DatasetMetadataResponse,
  DatasetSummary,
} from "@/features/datasets/query-contract";
import { cn } from "@/lib/utils";

type DatasetContextSource = DatasetMetadataResponse["dataset"] | DatasetSummary;

const datasetContextStyles = {
  global: {
    icon: Globe2,
    label: "Global",
    styles: "border-sky-200 bg-sky-50 text-sky-700",
  },
  private: {
    icon: Lock,
    label: "Private",
    styles: "border-amber-200 bg-amber-50 text-amber-700",
  },
  shared: {
    icon: Share2,
    label: "Shared",
    styles: "border-violet-200 bg-violet-50 text-violet-700",
  },
  workspace: {
    icon: Users2,
    label: "Workspace",
    styles: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
} as const;

interface DatasetContextBadgeProps {
  className?: string;
  dataset: DatasetContextSource;
}

export const DatasetContextBadge = ({
  className,
  dataset,
}: DatasetContextBadgeProps) => {
  const config = datasetContextStyles[dataset.accessMode];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge className={cn("font-medium", config.styles)} variant="outline">
        <Icon aria-hidden="true" className="size-3.5" />
        {config.label}
      </Badge>
      {dataset.isHomeDataset ? (
        <Badge
          className="border-blue-200 bg-blue-50 text-blue-700"
          variant="outline"
        >
          <House aria-hidden="true" className="size-3.5" />
          Home dataset
        </Badge>
      ) : null}
    </div>
  );
};
