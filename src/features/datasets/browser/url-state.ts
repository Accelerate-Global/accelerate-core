import {
  type DatasetBrowserPageSize,
  type DatasetBrowserRangeFilter,
  type DatasetBrowserSearchState,
  type DatasetBrowserSortDirection,
  type DatasetBrowserTextFilter,
  datasetBrowserPageSizeOptions,
  getDatasetBrowserColumnMap,
  isDatasetBrowserRangeFilterColumn,
  isDatasetBrowserTextFilterColumn,
  isDatasetBrowserUuid,
  normalizeDatasetBrowserColumnDataType,
} from "@/features/datasets/browser/types";
import type {
  DatasetColumnDefinition,
  DatasetFilter,
  DatasetQueryRequest,
} from "@/features/datasets/query-contract";

type SearchParamValue = string | string[] | undefined;

export type DatasetBrowserSearchParamsInput =
  | Record<string, SearchParamValue>
  | URLSearchParams;

const defaultPage = 1;
const defaultPageSize: DatasetBrowserPageSize = 50;

const getFirstSearchParamValue = (
  value: SearchParamValue
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const getSearchEntries = (searchParams: DatasetBrowserSearchParamsInput) => {
  if (searchParams instanceof URLSearchParams) {
    return Array.from(searchParams.entries());
  }

  return Object.entries(searchParams).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => [key, entry] as const);
    }

    const firstValue = getFirstSearchParamValue(value);

    return firstValue ? [[key, firstValue] as const] : [];
  });
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number
): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
};

const parsePageSize = (value: string | undefined): DatasetBrowserPageSize => {
  if (!value) {
    return defaultPageSize;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (
    datasetBrowserPageSizeOptions.includes(
      parsedValue as DatasetBrowserPageSize
    )
  ) {
    return parsedValue as DatasetBrowserPageSize;
  }

  return defaultPageSize;
};

const parseSortDirection = (
  value: string | undefined
): DatasetBrowserSortDirection | undefined => {
  if (value === "asc" || value === "desc") {
    return value;
  }

  return undefined;
};

const isNonEmptyString = (value: string | undefined): value is string => {
  return Boolean(value?.trim());
};

const normalizeSearchValue = (
  value: string | undefined
): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  return value.trim();
};

const isTextFilterParam = (key: string): boolean => {
  return (
    key.startsWith("filter_") &&
    !key.startsWith("filterMin_") &&
    !key.startsWith("filterMax_") &&
    !key.startsWith("filterOp_")
  );
};

const setRangeFilterValue = (
  rangeFilters: Record<string, DatasetBrowserRangeFilter>,
  field: string,
  type: "max" | "min",
  value: string
) => {
  rangeFilters[field] = {
    ...rangeFilters[field],
    field,
    [type]: value,
  };
};

const parseDatasetBrowserFilterState = (
  searchParams: DatasetBrowserSearchParamsInput
): Pick<DatasetBrowserSearchState, "rangeFilters" | "textFilters"> => {
  const entryMap = new Map(getSearchEntries(searchParams));
  const textFilters: Record<string, DatasetBrowserTextFilter> = {};
  const rangeFilters: Record<string, DatasetBrowserRangeFilter> = {};
  const applyRangeFilter = (
    key: string,
    type: "max" | "min",
    value: string
  ) => {
    const field =
      type === "min"
        ? key.slice("filterMin_".length)
        : key.slice("filterMax_".length);

    if (field) {
      setRangeFilterValue(rangeFilters, field, type, value);
    }
  };

  for (const [key, rawValue] of getSearchEntries(searchParams)) {
    const value = normalizeSearchValue(rawValue);

    if (!value) {
      continue;
    }

    if (isTextFilterParam(key)) {
      const field = key.slice("filter_".length);

      if (!field) {
        continue;
      }

      textFilters[field] = {
        field,
        op: entryMap.get(`filterOp_${field}`) === "eq" ? "eq" : "contains",
        value,
      };

      continue;
    }

    if (key.startsWith("filterMin_")) {
      applyRangeFilter(key, "min", value);

      continue;
    }

    if (key.startsWith("filterMax_")) {
      applyRangeFilter(key, "max", value);
    }
  }

  return {
    rangeFilters,
    textFilters,
  };
};

export const parseDatasetBrowserSearchState = (
  searchParams: DatasetBrowserSearchParamsInput
): DatasetBrowserSearchState => {
  const entryMap = new Map(getSearchEntries(searchParams));
  const filterState = parseDatasetBrowserFilterState(searchParams);
  const versionIdValue = normalizeSearchValue(entryMap.get("versionId"));

  return {
    page: parsePositiveInteger(entryMap.get("page"), defaultPage),
    pageSize: parsePageSize(entryMap.get("pageSize")),
    rangeFilters: filterState.rangeFilters,
    sortDirection: parseSortDirection(entryMap.get("sortDirection")),
    sortField: normalizeSearchValue(entryMap.get("sortField")),
    textFilters: filterState.textFilters,
    versionId:
      versionIdValue && isDatasetBrowserUuid(versionIdValue)
        ? versionIdValue
        : undefined,
  };
};

const normalizeNumberFilterValue = (value: string): number | null => {
  const parsedValue = Number(value);

  if (Number.isFinite(parsedValue)) {
    return parsedValue;
  }

  return null;
};

const normalizeDatetimeFilterValue = (value: string): string => {
  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return value;
  }

  return parsedValue.toISOString();
};

const toDatasetFilterValue = (
  column: DatasetColumnDefinition,
  value: string
): string | number => {
  switch (normalizeDatasetBrowserColumnDataType(column.dataType)) {
    case "number": {
      return normalizeNumberFilterValue(value) ?? value;
    }
    case "datetime": {
      return normalizeDatetimeFilterValue(value);
    }
    default: {
      return value;
    }
  }
};

const buildTextDatasetFilters = (
  searchState: DatasetBrowserSearchState,
  columnsByKey: Map<string, DatasetColumnDefinition>
): DatasetFilter[] => {
  const filters: DatasetFilter[] = [];

  for (const [field, textFilter] of Object.entries(searchState.textFilters)) {
    if (!isNonEmptyString(textFilter.value)) {
      continue;
    }

    const column = columnsByKey.get(field);

    if (!column) {
      continue;
    }

    if (!isDatasetBrowserTextFilterColumn(column)) {
      continue;
    }

    filters.push({
      field,
      op: textFilter.op,
      value: toDatasetFilterValue(column, textFilter.value),
    });
  }

  return filters;
};

const sanitizeDatasetBrowserTextFilters = (
  searchState: DatasetBrowserSearchState,
  columnsByKey: Map<string, DatasetColumnDefinition>
): Record<string, DatasetBrowserTextFilter> => {
  const nextTextFilters: Record<string, DatasetBrowserTextFilter> = {};

  for (const [field, filter] of Object.entries(searchState.textFilters)) {
    const column = columnsByKey.get(field);

    if (!(column && isDatasetBrowserTextFilterColumn(column))) {
      continue;
    }

    const value = normalizeSearchValue(filter.value);

    if (!value) {
      continue;
    }

    nextTextFilters[field] = {
      field,
      op: filter.op === "eq" ? "eq" : "contains",
      value,
    };
  }

  return nextTextFilters;
};

const sanitizeDatasetBrowserRangeFilters = (
  searchState: DatasetBrowserSearchState,
  columnsByKey: Map<string, DatasetColumnDefinition>
): Record<string, DatasetBrowserRangeFilter> => {
  const nextRangeFilters: Record<string, DatasetBrowserRangeFilter> = {};

  for (const [field, filter] of Object.entries(searchState.rangeFilters)) {
    const column = columnsByKey.get(field);

    if (!(column && isDatasetBrowserRangeFilterColumn(column))) {
      continue;
    }

    const min = normalizeSearchValue(filter.min);
    const max = normalizeSearchValue(filter.max);

    if (!(min || max)) {
      continue;
    }

    nextRangeFilters[field] = {
      field,
      ...(min ? { min } : {}),
      ...(max ? { max } : {}),
    };
  }

  return nextRangeFilters;
};

const buildRangeDatasetFilters = (
  searchState: DatasetBrowserSearchState,
  columnsByKey: Map<string, DatasetColumnDefinition>
): DatasetFilter[] => {
  const filters: DatasetFilter[] = [];

  for (const [field, rangeFilter] of Object.entries(searchState.rangeFilters)) {
    const column = columnsByKey.get(field);

    if (!column?.filterable) {
      continue;
    }

    const normalizedType = normalizeDatasetBrowserColumnDataType(
      column.dataType
    );

    if (
      normalizedType !== "date" &&
      normalizedType !== "datetime" &&
      normalizedType !== "number"
    ) {
      continue;
    }

    if (isNonEmptyString(rangeFilter.min)) {
      filters.push({
        field,
        op: "gte",
        value: toDatasetFilterValue(column, rangeFilter.min),
      });
    }

    if (isNonEmptyString(rangeFilter.max)) {
      filters.push({
        field,
        op: "lte",
        value: toDatasetFilterValue(column, rangeFilter.max),
      });
    }
  }

  return filters;
};

const buildDatasetSort = (
  searchState: DatasetBrowserSearchState,
  columnsByKey: Map<string, DatasetColumnDefinition>
): DatasetQueryRequest["sort"] => {
  const sortField = searchState.sortField?.trim();

  if (!sortField) {
    return [];
  }

  const column = columnsByKey.get(sortField);

  if (!(column?.sortable && searchState.sortDirection)) {
    return [];
  }

  return [
    {
      direction: searchState.sortDirection,
      field: sortField,
    },
  ];
};

export const sanitizeDatasetBrowserSearchState = (
  searchState: DatasetBrowserSearchState,
  columns: DatasetColumnDefinition[]
): DatasetBrowserSearchState => {
  const columnsByKey = getDatasetBrowserColumnMap(columns);
  const sortField = searchState.sortField?.trim();
  const sortColumn = sortField ? columnsByKey.get(sortField) : undefined;
  const hasValidSort = Boolean(
    sortColumn?.sortable && searchState.sortDirection
  );

  return {
    ...searchState,
    rangeFilters: sanitizeDatasetBrowserRangeFilters(searchState, columnsByKey),
    sortDirection: hasValidSort ? searchState.sortDirection : undefined,
    sortField: hasValidSort ? sortField : undefined,
    textFilters: sanitizeDatasetBrowserTextFilters(searchState, columnsByKey),
  };
};

export const buildDatasetQueryRequest = (
  searchState: DatasetBrowserSearchState,
  columns: DatasetColumnDefinition[]
): DatasetQueryRequest => {
  const sanitizedSearchState = sanitizeDatasetBrowserSearchState(
    searchState,
    columns
  );
  const columnsByKey = getDatasetBrowserColumnMap(columns);
  const filters = [
    ...buildTextDatasetFilters(sanitizedSearchState, columnsByKey),
    ...buildRangeDatasetFilters(sanitizedSearchState, columnsByKey),
  ];

  return {
    filters,
    page: sanitizedSearchState.page,
    pageSize: sanitizedSearchState.pageSize,
    sort: buildDatasetSort(sanitizedSearchState, columnsByKey),
    versionId: sanitizedSearchState.versionId,
  };
};

export const buildDatasetBrowserSearchParams = (
  searchState: DatasetBrowserSearchState
): URLSearchParams => {
  const params = new URLSearchParams();

  if (searchState.page > defaultPage) {
    params.set("page", String(searchState.page));
  }

  if (searchState.pageSize !== defaultPageSize) {
    params.set("pageSize", String(searchState.pageSize));
  }

  if (searchState.sortField && searchState.sortDirection) {
    params.set("sortField", searchState.sortField);
    params.set("sortDirection", searchState.sortDirection);
  }

  const sortedTextFilters = Object.values(searchState.textFilters).sort(
    (left, right) => left.field.localeCompare(right.field)
  );

  for (const filter of sortedTextFilters) {
    if (!isNonEmptyString(filter.value)) {
      continue;
    }

    params.set(`filter_${filter.field}`, filter.value);
    params.set(`filterOp_${filter.field}`, filter.op);
  }

  const sortedRangeFilters = Object.values(searchState.rangeFilters).sort(
    (left, right) => left.field.localeCompare(right.field)
  );

  for (const filter of sortedRangeFilters) {
    if (isNonEmptyString(filter.min)) {
      params.set(`filterMin_${filter.field}`, filter.min);
    }

    if (isNonEmptyString(filter.max)) {
      params.set(`filterMax_${filter.field}`, filter.max);
    }
  }

  if (searchState.versionId) {
    params.set("versionId", searchState.versionId);
  }

  return params;
};

export const getDatasetBrowserStateKey = (
  searchState: DatasetBrowserSearchState
): string => {
  return buildDatasetBrowserSearchParams(searchState).toString();
};
