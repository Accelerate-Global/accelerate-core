"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import type { ResourceRow, ResourceRowValue } from "@accelerate-core/shared";

export type EditableTableValue = {
  columns: string[];
  rows: Array<Record<string, ResourceRowValue>>;
};

type TableRow = {
  __index: number;
} & Record<string, ResourceRowValue>;

function normalizeColumnName(input: string): string {
  return input.trim().replace(/\s+/g, "_");
}

function toCellString(value: ResourceRowValue | undefined): string {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
}

export function ResourceTableEditor(props: {
  value: EditableTableValue;
  onChange?: (next: EditableTableValue) => void;
  readOnly?: boolean;
}) {
  const { value, onChange, readOnly = false } = props;
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [newColumnName, setNewColumnName] = useState("");
  const [tableError, setTableError] = useState<string | null>(null);

  const tableRows = useMemo<TableRow[]>(
    () =>
      value.rows.map((row, idx) => ({
        __index: idx,
        ...row
      })),
    [value.rows]
  );

  const updateCell = (rowIndex: number, column: string, nextValue: string) => {
    if (!onChange || readOnly) return;
    const nextRows = value.rows.map((row, idx) => {
      if (idx !== rowIndex) return row;
      return {
        ...row,
        [column]: nextValue
      };
    });
    onChange({
      columns: value.columns,
      rows: nextRows
    });
  };

  const addRow = () => {
    if (!onChange || readOnly) return;
    const nextRow: ResourceRow = {};
    for (const column of value.columns) nextRow[column] = "";
    onChange({
      columns: value.columns,
      rows: [...value.rows, nextRow]
    });
  };

  const deleteSelectedRows = () => {
    if (!onChange || readOnly || selectedRows.size === 0) return;
    const nextRows = value.rows.filter((_, idx) => !selectedRows.has(idx));
    setSelectedRows(new Set());
    onChange({
      columns: value.columns,
      rows: nextRows
    });
  };

  const addColumn = () => {
    if (!onChange || readOnly) return;
    const key = normalizeColumnName(newColumnName);
    if (!key) {
      setTableError("Column name is required.");
      return;
    }
    const exists = value.columns.some((col) => col.toLowerCase() === key.toLowerCase());
    if (exists) {
      setTableError(`Column already exists: ${key}`);
      return;
    }

    setTableError(null);
    setNewColumnName("");
    const nextColumns = [...value.columns, key];
    const nextRows = value.rows.map((row) => ({
      ...row,
      [key]: ""
    }));
    onChange({
      columns: nextColumns,
      rows: nextRows
    });
  };

  const deleteColumn = (columnKey: string) => {
    if (!onChange || readOnly) return;
    const nextColumns = value.columns.filter((col) => col !== columnKey);
    if (nextColumns.length === 0) {
      setTableError("A resource table must keep at least one column.");
      return;
    }
    setTableError(null);
    const nextRows = value.rows.map((row) => {
      const out: ResourceRow = {};
      for (const key of nextColumns) out[key] = row[key] ?? "";
      return out;
    });
    onChange({
      columns: nextColumns,
      rows: nextRows
    });
  };

  const columnHelper = createColumnHelper<TableRow>();
  const tableColumns = useMemo<ColumnDef<TableRow, unknown>[]>(() => {
    const cols: ColumnDef<TableRow, unknown>[] = [];

    if (!readOnly) {
      cols.push(
        columnHelper.display({
          id: "__select",
          header: () => (
            <input
              aria-label="Select all rows"
              type="checkbox"
              checked={value.rows.length > 0 && selectedRows.size === value.rows.length}
              onChange={(event) => {
                if (event.currentTarget.checked) {
                  setSelectedRows(new Set(value.rows.map((_, idx) => idx)));
                } else {
                  setSelectedRows(new Set());
                }
              }}
            />
          ),
          cell: ({ row }) => (
            <input
              aria-label={`Select row ${row.original.__index + 1}`}
              type="checkbox"
              checked={selectedRows.has(row.original.__index)}
              onChange={(event) => {
                const next = new Set(selectedRows);
                if (event.currentTarget.checked) next.add(row.original.__index);
                else next.delete(row.original.__index);
                setSelectedRows(next);
              }}
            />
          )
        })
      );
    }

    for (const key of value.columns) {
      cols.push(
        columnHelper.display({
          id: key,
          header: () => (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{key}</span>
              {!readOnly ? (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "2px 6px", minWidth: "auto" }}
                  onClick={() => deleteColumn(key)}
                >
                  x
                </button>
              ) : null}
            </div>
          ),
          cell: ({ row }) => {
            const valueRaw = row.original[key];
            if (readOnly) {
              return <span>{toCellString(valueRaw)}</span>;
            }
            return (
              <input
                value={toCellString(valueRaw)}
                onChange={(event) => updateCell(row.original.__index, key, event.currentTarget.value)}
                style={{ width: "100%" }}
              />
            );
          }
        })
      );
    }

    return cols;
  }, [columnHelper, deleteColumn, readOnly, selectedRows, updateCell, value.columns, value.rows.length]);

  const table = useReactTable({
    data: tableRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {!readOnly ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" type="button" onClick={addRow}>
            Add row
          </button>
          <button className="btn" type="button" onClick={deleteSelectedRows} disabled={selectedRows.size === 0}>
            Delete selected rows
          </button>
          <input
            placeholder="new_column"
            value={newColumnName}
            onChange={(event) => setNewColumnName(event.currentTarget.value)}
          />
          <button className="btn" type="button" onClick={addColumn}>
            Add column
          </button>
        </div>
      ) : null}

      {tableError ? <p className="muted">Error: {tableError}</p> : null}

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={tableColumns.length || 1}>
                  <span className="muted">No rows</span>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
