"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DatasetColumnDefinition,
  DatasetQueryResponse,
} from "@/features/datasets/query-contract";

import type { DatasetBrowserSortDirection } from "./types";

interface DatasetTableProps {
  columns: DatasetColumnDefinition[];
  isBusy: boolean;
  onToggleSort: (field: string) => void;
  query: DatasetQueryResponse;
  sortDirection?: DatasetBrowserSortDirection;
  sortField?: string;
}

const formatDatasetCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
};

const getSortIcon = (
  columnKey: string,
  sortField?: string,
  sortDirection?: DatasetBrowserSortDirection
) => {
  if (sortField !== columnKey) {
    return <ArrowUpDown aria-hidden="true" className="size-3.5" />;
  }

  if (sortDirection === "asc") {
    return <ArrowUp aria-hidden="true" className="size-3.5" />;
  }

  return <ArrowDown aria-hidden="true" className="size-3.5" />;
};

export const DatasetTable = ({
  columns,
  isBusy,
  onToggleSort,
  query,
  sortDirection,
  sortField,
}: DatasetTableProps) => {
  const tableColumns: ColumnDef<DatasetQueryResponse["rows"][number]>[] =
    columns.map((column) => ({
      cell: ({ row }) => {
        return (
          <span className="block max-w-[28rem] truncate">
            {formatDatasetCellValue(row.original.values[column.key])}
          </span>
        );
      },
      enableSorting: column.sortable,
      header: () => {
        if (!column.sortable) {
          return column.label;
        }

        return (
          <Button
            className="-ml-3"
            onClick={() => {
              onToggleSort(column.key);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {column.label}
            {getSortIcon(column.key, sortField, sortDirection)}
          </Button>
        );
      },
      id: column.key,
    }));

  const table = useReactTable({
    columns: tableColumns,
    data: query.rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.rowId,
    manualPagination: true,
    manualSorting: true,
    pageCount: query.totalPages,
    state: {
      sorting:
        sortField && sortDirection
          ? [{ desc: sortDirection === "desc", id: sortField }]
          : [],
    },
  });

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm">
      {isBusy ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 animate-pulse bg-primary/70" />
      ) : null}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
