"use client";

import { Filter, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DatasetColumnDefinition } from "@/features/datasets/query-contract";

import { DatasetFilters } from "./dataset-filters";
import type {
  DatasetBrowserRangeFilter,
  DatasetBrowserTextFilter,
} from "./types";

interface DatasetToolbarProps {
  activeFilterCount: number;
  columns: DatasetColumnDefinition[];
  hasActiveSort: boolean;
  isBusy: boolean;
  onApplyFilters: (
    nextTextFilters: Record<string, DatasetBrowserTextFilter>,
    nextRangeFilters: Record<string, DatasetBrowserRangeFilter>
  ) => void;
  onResetBrowserState: () => void;
  onResetFilters: () => void;
  rangeFilters: Record<string, DatasetBrowserRangeFilter>;
  textFilters: Record<string, DatasetBrowserTextFilter>;
}

export const DatasetToolbar = ({
  activeFilterCount,
  columns,
  hasActiveSort,
  isBusy,
  onApplyFilters,
  onResetBrowserState,
  onResetFilters,
  rangeFilters,
  textFilters,
}: DatasetToolbarProps) => {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter aria-hidden="true" className="size-4" />
              Browser controls
            </CardTitle>
            <CardDescription>
              Filters stay backend-driven and only use declared dataset columns.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-sm">
              {activeFilterCount === 0
                ? "No active filters"
                : `${activeFilterCount} active ${
                    activeFilterCount === 1 ? "filter" : "filters"
                  }`}
              {hasActiveSort ? ", sorted" : ""}
            </div>
            <Button
              disabled={isBusy}
              onClick={onResetBrowserState}
              type="button"
              variant="ghost"
            >
              <RotateCcw aria-hidden="true" />
              Reset browser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DatasetFilters
          columns={columns}
          isBusy={isBusy}
          onApply={onApplyFilters}
          onReset={onResetFilters}
          rangeFilters={rangeFilters}
          textFilters={textFilters}
        />
      </CardContent>
    </Card>
  );
};
