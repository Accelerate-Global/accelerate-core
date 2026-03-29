"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { ErrorState } from "@/components/feedback/error-state";
import type {
  DatasetMetadataResponse,
  DatasetQueryResponse,
} from "@/features/datasets/query-contract";

import { DatasetBrowserApiError } from "./api-common";
import { queryDatasetRowsClient } from "./client-api";
import {
  DatasetAccessDeniedState,
  DatasetEmptyState,
  DatasetStatusState,
} from "./dataset-empty-state";
import { DatasetHeader } from "./dataset-header";
import { DatasetPagination } from "./dataset-pagination";
import { DatasetTable } from "./dataset-table";
import { DatasetToolbar } from "./dataset-toolbar";
import type {
  DatasetBrowserRangeFilter,
  DatasetBrowserSearchState,
  DatasetBrowserTextFilter,
} from "./types";
import {
  buildDatasetBrowserSearchParams,
  buildDatasetQueryRequest,
  getDatasetBrowserStateKey,
  parseDatasetBrowserSearchState,
  sanitizeDatasetBrowserSearchState,
} from "./url-state";

interface DatasetBrowserShellProps {
  datasetId: string;
  initialQuery: DatasetQueryResponse;
  initialSearchState: DatasetBrowserSearchState;
  isHomePage?: boolean;
  metadata: DatasetMetadataResponse;
  stateKey: string;
}

const countActiveFilters = (searchState: DatasetBrowserSearchState): number => {
  let total = 0;

  for (const filter of Object.values(searchState.textFilters)) {
    if (filter.value.trim()) {
      total += 1;
    }
  }

  for (const filter of Object.values(searchState.rangeFilters)) {
    if (filter.min?.trim() || filter.max?.trim()) {
      total += 1;
    }
  }

  return total;
};

export const DatasetBrowserShell = ({
  datasetId,
  initialQuery,
  initialSearchState,
  isHomePage = false,
  metadata,
  stateKey,
}: DatasetBrowserShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [resolvedStateKey, setResolvedStateKey] = useState(stateKey);
  const [queryError, setQueryError] = useState<DatasetBrowserApiError | null>(
    null
  );
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [isRouting, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
    setResolvedStateKey(stateKey);
    setQueryError(null);
  }, [initialQuery, stateKey]);

  const searchState = sanitizeDatasetBrowserSearchState(
    parseDatasetBrowserSearchState(searchParams),
    metadata.columns
  );
  const currentStateKey = getDatasetBrowserStateKey(searchState);

  const replaceSearchState = useCallback(
    (nextState: DatasetBrowserSearchState) => {
      const nextParams = buildDatasetBrowserSearchParams(nextState);
      const nextQueryString = nextParams.toString();
      const nextHref = nextQueryString
        ? `${pathname}?${nextQueryString}`
        : pathname;

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (currentStateKey === resolvedStateKey) {
      return;
    }

    const abortController = new AbortController();
    const request = buildDatasetQueryRequest(searchState, metadata.columns);

    setIsQueryLoading(true);
    setQueryError(null);

    queryDatasetRowsClient(datasetId, request, abortController.signal)
      .then((response) => {
        if (abortController.signal.aborted) {
          return;
        }

        const normalizedSearchState =
          response.page === searchState.page
            ? searchState
            : {
                ...searchState,
                page: response.page,
              };
        const normalizedStateKey = getDatasetBrowserStateKey(
          normalizedSearchState
        );

        setQuery(response);
        setQueryError(null);
        setResolvedStateKey(normalizedStateKey);
        setIsQueryLoading(false);

        if (normalizedStateKey !== currentStateKey) {
          replaceSearchState(normalizedSearchState);
        }
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        if (error instanceof DatasetBrowserApiError) {
          setQueryError(error);
          setIsQueryLoading(false);

          return;
        }

        throw error;
      });

    return () => {
      abortController.abort();
    };
  }, [
    currentStateKey,
    datasetId,
    metadata.columns,
    replaceSearchState,
    resolvedStateKey,
    searchState,
  ]);

  const activeFilterCount = countActiveFilters(searchState);
  const hasActiveSort = Boolean(
    searchState.sortField && searchState.sortDirection
  );
  const isBusy = isQueryLoading || isRouting;

  if (queryError?.status === 403) {
    return <DatasetAccessDeniedState />;
  }

  if (queryError?.status === 404) {
    return (
      <DatasetStatusState
        description="This dataset could not be found, or the link no longer points to a readable dataset."
        title="Dataset not found"
      />
    );
  }

  if (queryError?.status === 409) {
    return (
      <DatasetStatusState
        description={
          queryError.body?.message ??
          "The requested dataset version is not available yet."
        }
        title="Dataset unavailable"
      />
    );
  }

  if (queryError) {
    return (
      <ErrorState
        description={
          queryError.body?.message ??
          "The dataset browser could not refresh this view."
        }
        reset={() => {
          replaceSearchState(initialSearchState);
        }}
        title="Dataset query failed"
      />
    );
  }

  if (metadata.columns.length === 0) {
    return (
      <DatasetStatusState
        description="This dataset version has no declared columns yet, so there is nothing safe to render in the browser."
        title="No declared columns"
      />
    );
  }

  return (
    <section className="space-y-6">
      <DatasetHeader
        activeFilterCount={activeFilterCount}
        isHomePage={isHomePage}
        metadata={metadata}
        query={query}
      />
      <DatasetToolbar
        activeFilterCount={activeFilterCount}
        columns={metadata.columns}
        hasActiveSort={hasActiveSort}
        isBusy={isBusy}
        onApplyFilters={(
          nextTextFilters: Record<string, DatasetBrowserTextFilter>,
          nextRangeFilters: Record<string, DatasetBrowserRangeFilter>
        ) => {
          replaceSearchState({
            ...searchState,
            page: 1,
            rangeFilters: nextRangeFilters,
            textFilters: nextTextFilters,
          });
        }}
        onResetBrowserState={() => {
          replaceSearchState({
            page: 1,
            pageSize: initialSearchState.pageSize,
            rangeFilters: {},
            textFilters: {},
            versionId: searchState.versionId,
          });
        }}
        onResetFilters={() => {
          replaceSearchState({
            ...searchState,
            page: 1,
            rangeFilters: {},
            textFilters: {},
          });
        }}
        rangeFilters={searchState.rangeFilters}
        textFilters={searchState.textFilters}
      />
      {query.totalRows === 0 ? (
        <DatasetEmptyState />
      ) : (
        <DatasetTable
          columns={metadata.columns}
          isBusy={isBusy}
          onToggleSort={(field) => {
            if (searchState.sortField !== field) {
              replaceSearchState({
                ...searchState,
                page: 1,
                sortDirection: "asc",
                sortField: field,
              });

              return;
            }

            if (searchState.sortDirection === "asc") {
              replaceSearchState({
                ...searchState,
                page: 1,
                sortDirection: "desc",
                sortField: field,
              });

              return;
            }

            replaceSearchState({
              ...searchState,
              page: 1,
              sortDirection: undefined,
              sortField: undefined,
            });
          }}
          query={query}
          sortDirection={searchState.sortDirection}
          sortField={searchState.sortField}
        />
      )}
      <DatasetPagination
        currentPage={query.page}
        isBusy={isBusy}
        onPageChange={(page) => {
          replaceSearchState({
            ...searchState,
            page,
          });
        }}
        onPageSizeChange={(pageSize) => {
          replaceSearchState({
            ...searchState,
            page: 1,
            pageSize,
          });
        }}
        pageSize={searchState.pageSize}
        totalPages={query.totalPages}
        totalRows={query.totalRows}
      />
    </section>
  );
};
