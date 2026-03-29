import "server-only";

import { z } from "zod";

import {
  createDatasetApiError,
  createInvalidRequestError,
  createValidationError,
} from "@/features/datasets/errors";
import { resolveDatasetVersionContext } from "@/features/datasets/metadata-service";
import {
  type DatasetColumnDefinition,
  type DatasetFilter,
  type DatasetQueryRequest,
  type DatasetQueryResponse,
  type DatasetSort,
  datasetQueryRequestSchema,
  datasetQueryResponseSchema,
  jsonValueSchema,
} from "@/features/datasets/query-contract";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type QueryDataType = "boolean" | "date" | "datetime" | "number" | "text";

interface QueryRowRpcRequestFilter {
  dataType: QueryDataType;
  op: DatasetFilter["op"];
  source: string;
  value?: string | string[] | null;
}

interface QueryRowRpcRequestSort {
  dataType: QueryDataType;
  direction: DatasetSort["direction"];
  source: string;
}

const comparableDataTypes = new Set<QueryDataType>([
  "date",
  "datetime",
  "number",
]);

const primitiveScalarSchema = z.union([z.string(), z.number(), z.boolean()]);

const rpcQueryRowSchema = z.object({
  attributes: z.record(z.string(), jsonValueSchema),
  createdAt: z.string().datetime({ offset: true }),
  pipelineRowId: z.string().trim().min(1),
  rowId: z.string().uuid(),
  updatedAt: z.string().datetime({ offset: true }),
});

const rpcQueryDatasetRowsResponseSchema = z.object({
  rows: z.array(rpcQueryRowSchema),
  totalRows: z.number().int().nonnegative(),
});

const normalizeQueryDataType = (dataType: string): QueryDataType => {
  switch (dataType.trim().toLowerCase()) {
    case "bool":
    case "boolean": {
      return "boolean";
    }
    case "date": {
      return "date";
    }
    case "datetime":
    case "timestamp":
    case "timestamptz": {
      return "datetime";
    }
    case "bigint":
    case "decimal":
    case "float":
    case "int":
    case "integer":
    case "number":
    case "numeric": {
      return "number";
    }
    default: {
      return "text";
    }
  }
};

const isSupportedQuerySource = (source: string): boolean => {
  if (
    source === "created_at" ||
    source === "pipeline_row_id" ||
    source === "updated_at"
  ) {
    return true;
  }

  if (!source.startsWith("attributes.")) {
    return false;
  }

  const attributeKey = source.slice("attributes.".length);

  return attributeKey.length > 0 && !attributeKey.includes(".");
};

const getColumnMap = (columns: DatasetColumnDefinition[]) => {
  return new Map(columns.map((column) => [column.key, column] as const));
};

const getQueryableColumn = (
  field: string,
  columnsByKey: Map<string, DatasetColumnDefinition>,
  type: "filter" | "sort"
) => {
  const column = columnsByKey.get(field);

  if (!(column && isSupportedQuerySource(column.source))) {
    throw createDatasetApiError(
      400,
      type === "filter" ? "INVALID_FILTER_FIELD" : "INVALID_SORT_FIELD",
      `The ${type} field "${field}" is not supported.`,
      { field }
    );
  }

  if (type === "filter" && !column.filterable) {
    throw createDatasetApiError(
      400,
      "INVALID_FILTER_FIELD",
      `The field "${field}" cannot be filtered.`,
      { field }
    );
  }

  if (type === "sort" && !column.sortable) {
    throw createDatasetApiError(
      400,
      "INVALID_SORT_FIELD",
      `The field "${field}" cannot be sorted.`,
      { field }
    );
  }

  return column;
};

const normalizeFilterValue = (
  filter: DatasetFilter,
  dataType: QueryDataType
): QueryRowRpcRequestFilter["value"] => {
  if (filter.op === "isNull") {
    return null;
  }

  if (filter.op === "in") {
    if (!Array.isArray(filter.value)) {
      throw createInvalidRequestError(
        `The filter "${filter.field}" requires an array value for "in".`,
        {
          field: filter.field,
          op: filter.op,
        }
      );
    }

    const values = filter.value.map((value) => {
      const parsedValue = primitiveScalarSchema.safeParse(value);

      if (!parsedValue.success) {
        throw createInvalidRequestError(
          `The filter "${filter.field}" must contain only primitive values.`,
          {
            field: filter.field,
            op: filter.op,
          }
        );
      }

      return String(parsedValue.data);
    });

    return values;
  }

  if (filter.op === "contains" || filter.op === "startsWith") {
    if (dataType !== "text" || typeof filter.value !== "string") {
      throw createDatasetApiError(
        400,
        "UNSUPPORTED_FILTER_OPERATOR",
        `The operator "${filter.op}" is only supported for text fields.`,
        {
          dataType,
          field: filter.field,
          op: filter.op,
        }
      );
    }

    return filter.value;
  }

  if (
    (filter.op === "gt" ||
      filter.op === "gte" ||
      filter.op === "lt" ||
      filter.op === "lte") &&
    !comparableDataTypes.has(dataType)
  ) {
    throw createDatasetApiError(
      400,
      "UNSUPPORTED_FILTER_OPERATOR",
      `The operator "${filter.op}" is not supported for "${filter.field}".`,
      {
        dataType,
        field: filter.field,
        op: filter.op,
      }
    );
  }

  const parsedValue = primitiveScalarSchema.safeParse(filter.value);

  if (!parsedValue.success) {
    throw createInvalidRequestError(
      `The filter "${filter.field}" requires a scalar value.`,
      {
        field: filter.field,
        op: filter.op,
      }
    );
  }

  return String(parsedValue.data);
};

const normalizeRpcFilters = (
  filters: DatasetFilter[],
  columns: DatasetColumnDefinition[]
): QueryRowRpcRequestFilter[] => {
  const columnsByKey = getColumnMap(columns);

  return filters.map((filter) => {
    const column = getQueryableColumn(filter.field, columnsByKey, "filter");
    const dataType = normalizeQueryDataType(column.dataType);

    return {
      dataType,
      op: filter.op,
      source: column.source,
      value: normalizeFilterValue(filter, dataType),
    };
  });
};

const normalizeRpcSorts = (
  sort: DatasetSort[],
  columns: DatasetColumnDefinition[]
): QueryRowRpcRequestSort[] => {
  const columnsByKey = getColumnMap(columns);

  return sort.map((sortEntry) => {
    const column = getQueryableColumn(sortEntry.field, columnsByKey, "sort");

    return {
      dataType: normalizeQueryDataType(column.dataType),
      direction: sortEntry.direction,
      source: column.source,
    };
  });
};

const getAttributeValue = (
  attributes: Record<string, z.infer<typeof jsonValueSchema>>,
  source: string
) => {
  if (!source.startsWith("attributes.")) {
    return null;
  }

  const attributeKey = source.slice("attributes.".length);

  return attributes[attributeKey] ?? null;
};

const buildRowValues = (
  columns: DatasetColumnDefinition[],
  row: z.infer<typeof rpcQueryRowSchema>
) => {
  const values: Record<string, z.infer<typeof jsonValueSchema>> = {};

  for (const column of columns) {
    switch (column.source) {
      case "created_at": {
        values[column.key] = row.createdAt;
        break;
      }
      case "pipeline_row_id": {
        values[column.key] = row.pipelineRowId;
        break;
      }
      case "updated_at": {
        values[column.key] = row.updatedAt;
        break;
      }
      default: {
        values[column.key] = getAttributeValue(row.attributes, column.source);
        break;
      }
    }
  }

  return values;
};

const runDatasetRowsRpc = async (
  versionId: string,
  filters: QueryRowRpcRequestFilter[],
  sort: QueryRowRpcRequestSort[],
  page: number,
  pageSize: number
) => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("query_dataset_rows", {
    target_dataset_version_id: versionId,
    target_filters: filters as unknown as Json,
    target_page: page,
    target_page_size: pageSize,
    target_sorts: sort as unknown as Json,
  });

  if (error) {
    if (error.code === "22023") {
      throw createInvalidRequestError(error.message);
    }

    throw createDatasetApiError(
      500,
      "INTERNAL_ERROR",
      `The dataset rows query failed: ${error.message}`
    );
  }

  const parsedResponse = rpcQueryDatasetRowsResponseSchema.safeParse(data);

  if (!parsedResponse.success) {
    throw createDatasetApiError(
      500,
      "INTERNAL_ERROR",
      "The dataset query response could not be validated."
    );
  }

  return parsedResponse.data;
};

const parseRequest = (payload: unknown): DatasetQueryRequest => {
  const parsedPayload = datasetQueryRequestSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw createValidationError(parsedPayload.error);
  }

  return parsedPayload.data;
};

export const queryDatasetRows = async (
  datasetId: string,
  payload: unknown
): Promise<DatasetQueryResponse> => {
  const request = parseRequest(payload);
  const context = await resolveDatasetVersionContext(
    datasetId,
    request.versionId
  );
  const rpcFilters = normalizeRpcFilters(request.filters, context.columns);
  const rpcSort = normalizeRpcSorts(request.sort, context.columns);
  const initialResult = await runDatasetRowsRpc(
    context.version.id,
    rpcFilters,
    rpcSort,
    request.page,
    request.pageSize
  );
  const totalPages =
    initialResult.totalRows === 0
      ? 0
      : Math.ceil(initialResult.totalRows / request.pageSize);
  const normalizedPage =
    totalPages === 0 ? 1 : Math.min(request.page, totalPages);
  const finalResult =
    normalizedPage === request.page
      ? initialResult
      : await runDatasetRowsRpc(
          context.version.id,
          rpcFilters,
          rpcSort,
          normalizedPage,
          request.pageSize
        );

  const response = {
    appliedFilters: request.filters,
    appliedSort: request.sort,
    page: normalizedPage,
    pageSize: request.pageSize,
    rows: finalResult.rows.map((row) => ({
      pipelineRowId: row.pipelineRowId,
      rowId: row.rowId,
      values: buildRowValues(context.columns, row),
    })),
    totalPages,
    totalRows: initialResult.totalRows,
  };
  const parsedResponse = datasetQueryResponseSchema.safeParse(response);

  if (!parsedResponse.success) {
    throw createDatasetApiError(
      500,
      "INTERNAL_ERROR",
      "The dataset query response could not be normalized."
    );
  }

  return parsedResponse.data;
};
