import type {
  DatasetColumnDefinition,
  DatasetMetadataResponse,
  DatasetQueryResponse,
  DatasetSummary,
} from "@/features/datasets/query-contract";

export const datasetBrowserPageSizeOptions = [25, 50, 100] as const;

export type DatasetBrowserPageSize =
  (typeof datasetBrowserPageSizeOptions)[number];

export type DatasetBrowserSortDirection = "asc" | "desc";

export type DatasetBrowserTextFilterOperator = "contains" | "eq";

export type DatasetBrowserColumnDataType =
  | "boolean"
  | "date"
  | "datetime"
  | "number"
  | "text";

export interface DatasetBrowserTextFilter {
  field: string;
  op: DatasetBrowserTextFilterOperator;
  value: string;
}

export interface DatasetBrowserRangeFilter {
  field: string;
  max?: string;
  min?: string;
}

export interface DatasetBrowserSearchState {
  page: number;
  pageSize: DatasetBrowserPageSize;
  rangeFilters: Record<string, DatasetBrowserRangeFilter>;
  sortDirection?: DatasetBrowserSortDirection;
  sortField?: string;
  textFilters: Record<string, DatasetBrowserTextFilter>;
  versionId?: string;
}

export interface DatasetBrowserReadyState {
  initialQuery: DatasetQueryResponse;
  initialSearchState: DatasetBrowserSearchState;
  metadata: DatasetMetadataResponse;
  stateKey: string;
  status: "ready";
}

export interface DatasetBrowserEmptyHomeState {
  status: "empty-home";
}

export interface DatasetBrowserAccessDeniedState {
  status: "access-denied";
}

export interface DatasetBrowserNotFoundState {
  status: "not-found";
}

export interface DatasetBrowserUnavailableState {
  message: string;
  status: "unavailable";
}

export type DatasetBrowserResolvedState =
  | DatasetBrowserAccessDeniedState
  | DatasetBrowserEmptyHomeState
  | DatasetBrowserNotFoundState
  | DatasetBrowserReadyState
  | DatasetBrowserUnavailableState;

const datasetBrowserUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isDatasetBrowserUuid = (value: string): boolean => {
  return datasetBrowserUuidPattern.test(value.trim());
};

export const normalizeDatasetBrowserColumnDataType = (
  dataType: string
): DatasetBrowserColumnDataType => {
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

export const isDatasetBrowserTextFilterDataType = (
  dataType: string
): boolean => {
  return normalizeDatasetBrowserColumnDataType(dataType) === "text";
};

export const isDatasetBrowserRangeFilterDataType = (
  dataType: string
): boolean => {
  const normalizedType = normalizeDatasetBrowserColumnDataType(dataType);

  return (
    normalizedType === "date" ||
    normalizedType === "datetime" ||
    normalizedType === "number"
  );
};

export const isDatasetBrowserTextFilterColumn = (
  column: DatasetColumnDefinition
): boolean => {
  return (
    column.filterable && isDatasetBrowserTextFilterDataType(column.dataType)
  );
};

export const isDatasetBrowserRangeFilterColumn = (
  column: DatasetColumnDefinition
): boolean => {
  return (
    column.filterable && isDatasetBrowserRangeFilterDataType(column.dataType)
  );
};

export const isDatasetBrowserSupportedFilterColumn = (
  column: DatasetColumnDefinition
): boolean => {
  return (
    isDatasetBrowserTextFilterColumn(column) ||
    isDatasetBrowserRangeFilterColumn(column)
  );
};

export const getDatasetBrowserColumnMap = (
  columns: DatasetColumnDefinition[]
): Map<string, DatasetColumnDefinition> => {
  return new Map(columns.map((column) => [column.key, column] as const));
};

export const findDatasetBrowserHomeDataset = (
  datasets: DatasetSummary[]
): DatasetSummary | null => {
  return datasets.find((dataset) => dataset.isHomeDataset) ?? null;
};
