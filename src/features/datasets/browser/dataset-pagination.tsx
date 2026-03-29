"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DatasetBrowserPageSize } from "@/features/datasets/browser/types";
import { datasetBrowserPageSizeOptions } from "@/features/datasets/browser/types";

interface DatasetPaginationProps {
  currentPage: number;
  isBusy: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: DatasetBrowserPageSize) => void;
  pageSize: DatasetBrowserPageSize;
  totalPages: number;
  totalRows: number;
}

export const DatasetPagination = ({
  currentPage,
  isBusy,
  onPageChange,
  onPageSizeChange,
  pageSize,
  totalPages,
  totalRows,
}: DatasetPaginationProps) => {
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = totalPages > 0 && currentPage < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-background px-4 py-3 shadow-sm">
      <div className="space-y-1">
        <p className="font-medium text-sm">
          {totalRows.toLocaleString()} {totalRows === 1 ? "row" : "rows"}
        </p>
        <p className="text-muted-foreground text-xs">
          {totalPages === 0
            ? "No pages yet"
            : `Page ${currentPage} of ${totalPages}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rows per page</span>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={isBusy}
            onChange={(event) => {
              onPageSizeChange(
                Number(event.currentTarget.value) as DatasetBrowserPageSize
              );
            }}
            value={pageSize}
          >
            {datasetBrowserPageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            disabled={isBusy || !hasPreviousPage}
            onClick={() => {
              onPageChange(currentPage - 1);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <Button
            disabled={isBusy || !hasNextPage}
            onClick={() => {
              onPageChange(currentPage + 1);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
