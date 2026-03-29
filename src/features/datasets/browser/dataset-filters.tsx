"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DatasetColumnDefinition } from "@/features/datasets/query-contract";
import { cn } from "@/lib/utils";

import {
  type DatasetBrowserRangeFilter,
  type DatasetBrowserTextFilter,
  isDatasetBrowserRangeFilterColumn,
  isDatasetBrowserSupportedFilterColumn,
  isDatasetBrowserTextFilterColumn,
  normalizeDatasetBrowserColumnDataType,
} from "./types";

interface DatasetFiltersProps {
  columns: DatasetColumnDefinition[];
  isBusy: boolean;
  onApply: (
    nextTextFilters: Record<string, DatasetBrowserTextFilter>,
    nextRangeFilters: Record<string, DatasetBrowserRangeFilter>
  ) => void;
  onReset: () => void;
  rangeFilters: Record<string, DatasetBrowserRangeFilter>;
  textFilters: Record<string, DatasetBrowserTextFilter>;
}

interface DatasetRangeFilterCardProps {
  column: DatasetColumnDefinition;
  rangeFilter?: DatasetBrowserRangeFilter;
  setDraftRangeFilters: Dispatch<
    SetStateAction<Record<string, DatasetBrowserRangeFilter>>
  >;
}

interface DatasetTextFilterCardProps {
  column: DatasetColumnDefinition;
  setDraftTextFilters: Dispatch<
    SetStateAction<Record<string, DatasetBrowserTextFilter>>
  >;
  textFilter?: DatasetBrowserTextFilter;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

const cloneTextFilters = (
  filters: Record<string, DatasetBrowserTextFilter>
): Record<string, DatasetBrowserTextFilter> => {
  return Object.fromEntries(
    Object.entries(filters).map(([key, filter]) => [key, { ...filter }])
  );
};

const cloneRangeFilters = (
  filters: Record<string, DatasetBrowserRangeFilter>
): Record<string, DatasetBrowserRangeFilter> => {
  return Object.fromEntries(
    Object.entries(filters).map(([key, filter]) => [key, { ...filter }])
  );
};

const getRangeInputType = (dataType: string): "date" | "number" | "text" => {
  const normalizedType = normalizeDatasetBrowserColumnDataType(dataType);

  if (normalizedType === "number") {
    return "number";
  }

  if (normalizedType === "date") {
    return "date";
  }

  return "text";
};

const getAppliedRangeFilter = (
  column: DatasetColumnDefinition,
  draftRangeFilters: Record<string, DatasetBrowserRangeFilter>
): DatasetBrowserRangeFilter | null => {
  const rangeFilter = draftRangeFilters[column.key];
  const min = rangeFilter?.min?.trim();
  const max = rangeFilter?.max?.trim();

  if (!(min || max)) {
    return null;
  }

  return {
    field: column.key,
    ...(min ? { min } : {}),
    ...(max ? { max } : {}),
  };
};

const getAppliedTextFilter = (
  column: DatasetColumnDefinition,
  draftTextFilters: Record<string, DatasetBrowserTextFilter>
): DatasetBrowserTextFilter | null => {
  const textFilter = draftTextFilters[column.key];
  const value = textFilter?.value?.trim();

  if (!value) {
    return null;
  }

  return {
    field: column.key,
    op: textFilter?.op === "eq" ? "eq" : "contains",
    value,
  };
};

const buildAppliedFilters = (
  columns: DatasetColumnDefinition[],
  draftTextFilters: Record<string, DatasetBrowserTextFilter>,
  draftRangeFilters: Record<string, DatasetBrowserRangeFilter>
) => {
  const nextTextFilters: Record<string, DatasetBrowserTextFilter> = {};
  const nextRangeFilters: Record<string, DatasetBrowserRangeFilter> = {};

  for (const column of columns) {
    if (isDatasetBrowserRangeFilterColumn(column)) {
      const nextRangeFilter = getAppliedRangeFilter(column, draftRangeFilters);

      if (nextRangeFilter) {
        nextRangeFilters[column.key] = nextRangeFilter;
      }

      continue;
    }

    if (!isDatasetBrowserTextFilterColumn(column)) {
      continue;
    }

    const nextTextFilter = getAppliedTextFilter(column, draftTextFilters);

    if (nextTextFilter) {
      nextTextFilters[column.key] = nextTextFilter;
    }
  }

  return {
    nextRangeFilters,
    nextTextFilters,
  };
};

const DatasetRangeFilterCard = ({
  column,
  rangeFilter,
  setDraftRangeFilters,
}: DatasetRangeFilterCardProps) => {
  const normalizedType = normalizeDatasetBrowserColumnDataType(column.dataType);

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <label
          className="font-medium text-sm"
          htmlFor={`filter-min-${column.key}`}
        >
          {column.label}
        </label>
        <p className="text-muted-foreground text-xs">
          Range filter for {column.dataType}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`filter-min-${column.key}`}
          >
            Min
          </label>
          <Input
            id={`filter-min-${column.key}`}
            onChange={(event) => {
              const min = event.currentTarget.value;

              setDraftRangeFilters((currentFilters) => ({
                ...currentFilters,
                [column.key]: {
                  ...currentFilters[column.key],
                  field: column.key,
                  max: currentFilters[column.key]?.max,
                  min,
                },
              }));
            }}
            placeholder={
              normalizedType === "datetime" ? "ISO timestamp" : "Min"
            }
            step={normalizedType === "number" ? "any" : undefined}
            type={getRangeInputType(column.dataType)}
            value={rangeFilter?.min ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`filter-max-${column.key}`}
          >
            Max
          </label>
          <Input
            id={`filter-max-${column.key}`}
            onChange={(event) => {
              const max = event.currentTarget.value;

              setDraftRangeFilters((currentFilters) => ({
                ...currentFilters,
                [column.key]: {
                  ...currentFilters[column.key],
                  field: column.key,
                  max,
                  min: currentFilters[column.key]?.min,
                },
              }));
            }}
            placeholder={
              normalizedType === "datetime" ? "ISO timestamp" : "Max"
            }
            step={normalizedType === "number" ? "any" : undefined}
            type={getRangeInputType(column.dataType)}
            value={rangeFilter?.max ?? ""}
          />
        </div>
      </div>
    </div>
  );
};

const DatasetTextFilterCard = ({
  column,
  setDraftTextFilters,
  textFilter,
}: DatasetTextFilterCardProps) => {
  const draftFilter = textFilter ?? {
    field: column.key,
    op: "contains",
    value: "",
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <label
          className="font-medium text-sm"
          htmlFor={`filter-value-${column.key}`}
        >
          {column.label}
        </label>
        <p className="text-muted-foreground text-xs">Contains or exact match</p>
      </div>
      <div className={cn("grid gap-3", "grid-cols-[140px_minmax(0,1fr)]")}>
        <div className="space-y-1.5">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`filter-op-${column.key}`}
          >
            Operator
          </label>
          <select
            className={selectClassName}
            id={`filter-op-${column.key}`}
            onChange={(event) => {
              const nextOp =
                event.currentTarget.value === "eq" ? "eq" : "contains";

              setDraftTextFilters((currentFilters) => ({
                ...currentFilters,
                [column.key]: {
                  field: column.key,
                  op: nextOp,
                  value: currentFilters[column.key]?.value ?? "",
                },
              }));
            }}
            value={draftFilter.op}
          >
            <option value="contains">Contains</option>
            <option value="eq">Equals</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`filter-value-${column.key}`}
          >
            Match
          </label>
          <Input
            id={`filter-value-${column.key}`}
            onChange={(event) => {
              const value = event.currentTarget.value;

              setDraftTextFilters((currentFilters) => ({
                ...currentFilters,
                [column.key]: {
                  field: column.key,
                  op: currentFilters[column.key]?.op ?? "contains",
                  value,
                },
              }));
            }}
            placeholder={`Filter ${column.label.toLowerCase()}`}
            value={draftFilter.value}
          />
        </div>
      </div>
    </div>
  );
};

export const DatasetFilters = ({
  columns,
  isBusy,
  onApply,
  onReset,
  rangeFilters,
  textFilters,
}: DatasetFiltersProps) => {
  const filterableColumns = columns.filter((column) =>
    isDatasetBrowserSupportedFilterColumn(column)
  );
  const [draftTextFilters, setDraftTextFilters] = useState(() =>
    cloneTextFilters(textFilters)
  );
  const [draftRangeFilters, setDraftRangeFilters] = useState(() =>
    cloneRangeFilters(rangeFilters)
  );

  useEffect(() => {
    setDraftTextFilters(cloneTextFilters(textFilters));
    setDraftRangeFilters(cloneRangeFilters(rangeFilters));
  }, [rangeFilters, textFilters]);

  if (filterableColumns.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This dataset version does not expose filterable columns yet.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();

        const nextFilters = buildAppliedFilters(
          filterableColumns,
          draftTextFilters,
          draftRangeFilters
        );

        onApply(nextFilters.nextTextFilters, nextFilters.nextRangeFilters);
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {filterableColumns.map((column) =>
          isDatasetBrowserRangeFilterColumn(column) ? (
            <DatasetRangeFilterCard
              column={column}
              key={column.key}
              rangeFilter={draftRangeFilters[column.key]}
              setDraftRangeFilters={setDraftRangeFilters}
            />
          ) : (
            <DatasetTextFilterCard
              column={column}
              key={column.key}
              setDraftTextFilters={setDraftTextFilters}
              textFilter={draftTextFilters[column.key]}
            />
          )
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isBusy} type="submit">
          Apply filters
        </Button>
        <Button
          disabled={isBusy}
          onClick={() => {
            setDraftTextFilters({});
            setDraftRangeFilters({});
            onReset();
          }}
          type="button"
          variant="ghost"
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
};
