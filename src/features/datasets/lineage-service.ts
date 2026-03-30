import type { DatasetColumnDefinition, DatasetVersionSource } from "./types";

interface LineageDatasetReference {
  id: string;
  name: string;
  slug: string;
}

interface LineageVersionReference {
  datasetId: string;
  id: string;
  versionNumber: number;
}

export interface DatasetVersionLineageNode {
  datasetId: string;
  datasetName: string;
  datasetSlug: string;
  depth: number;
  isSelected: boolean;
  relationTypes: string[];
  versionId: string;
  versionNumber: number;
}

export interface DatasetVersionLineageGraph {
  directSourceCount: number;
  maxDepth: number;
  nodes: DatasetVersionLineageNode[];
  relationTypes: string[];
  totalAncestorCount: number;
}

export interface DatasetVersionTypeChange {
  fieldKey: string;
  fromDataType: string;
  toDataType: string;
}

export interface DatasetVersionComparisonSummary {
  addedColumns: string[];
  addedLineageSources: string[];
  changeSummaryChanged: boolean;
  notesChanged: boolean;
  removedColumns: string[];
  removedLineageSources: string[];
  rowCountDelta: number;
  typeChanges: DatasetVersionTypeChange[];
}

const MAX_LINEAGE_DEPTH = 24;
interface LineageTraversalState {
  nodeByVersionId: Map<string, DatasetVersionLineageNode>;
}

const normalizeOptionalText = (
  value: string | null | undefined
): string | null => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};

const getColumnLabel = (column: DatasetColumnDefinition): string => {
  return column.label === column.key
    ? column.key
    : `${column.label} (${column.key})`;
};

const getSourceLabel = (
  sourceVersionId: string,
  datasetsById: Map<string, LineageDatasetReference>,
  versionsById: Map<string, LineageVersionReference>
): string | null => {
  const version = versionsById.get(sourceVersionId);

  if (!version) {
    return null;
  }

  const dataset = datasetsById.get(version.datasetId);

  if (!dataset) {
    return `Unknown dataset · v${version.versionNumber}`;
  }

  return `${dataset.name} · v${version.versionNumber}`;
};

const buildSourcesByVersionId = (
  sources: DatasetVersionSource[]
): Map<string, DatasetVersionSource[]> => {
  const sourcesByVersionId = new Map<string, DatasetVersionSource[]>();

  for (const source of sources) {
    const currentSources =
      sourcesByVersionId.get(source.datasetVersionId) ?? [];
    currentSources.push(source);
    sourcesByVersionId.set(source.datasetVersionId, currentSources);
  }

  return sourcesByVersionId;
};

const upsertLineageNode = (input: {
  nextDepth: number;
  nodeByVersionId: Map<string, DatasetVersionLineageNode>;
  source: DatasetVersionSource;
  sourceDataset: LineageDatasetReference;
  sourceVersion: LineageVersionReference;
}): void => {
  const existingNode = input.nodeByVersionId.get(input.sourceVersion.id);

  if (existingNode) {
    existingNode.depth = Math.min(existingNode.depth, input.nextDepth);

    if (!existingNode.relationTypes.includes(input.source.relationType)) {
      existingNode.relationTypes.push(input.source.relationType);
      existingNode.relationTypes.sort((leftType, rightType) =>
        leftType.localeCompare(rightType)
      );
    }

    return;
  }

  input.nodeByVersionId.set(input.sourceVersion.id, {
    datasetId: input.sourceDataset.id,
    datasetName: input.sourceDataset.name,
    datasetSlug: input.sourceDataset.slug,
    depth: input.nextDepth,
    isSelected: false,
    relationTypes: [input.source.relationType],
    versionId: input.sourceVersion.id,
    versionNumber: input.sourceVersion.versionNumber,
  });
};

const shouldQueueSourceVersion = (
  sourceVersionId: string,
  nextDepth: number,
  shortestDepthByVersionId: Map<string, number>
): boolean => {
  const bestDepthSeen = shortestDepthByVersionId.get(sourceVersionId);

  if (bestDepthSeen !== undefined && bestDepthSeen <= nextDepth) {
    return false;
  }

  shortestDepthByVersionId.set(sourceVersionId, nextDepth);
  return true;
};

const traverseLineageGraph = (input: {
  datasetsById: Map<string, LineageDatasetReference>;
  selectedVersionId: string;
  sourcesByVersionId: Map<string, DatasetVersionSource[]>;
  versionsById: Map<string, LineageVersionReference>;
}): LineageTraversalState => {
  const nodeByVersionId = new Map<string, DatasetVersionLineageNode>();
  const shortestDepthByVersionId = new Map<string, number>([
    [input.selectedVersionId, 0],
  ]);
  const queue: Array<{ depth: number; versionId: string }> = [
    { depth: 0, versionId: input.selectedVersionId },
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || current.depth >= MAX_LINEAGE_DEPTH) {
      continue;
    }

    const nextDepth = current.depth + 1;

    for (const source of input.sourcesByVersionId.get(current.versionId) ??
      []) {
      const sourceVersion = input.versionsById.get(
        source.sourceDatasetVersionId
      );
      const sourceDataset = sourceVersion
        ? input.datasetsById.get(sourceVersion.datasetId)
        : null;

      if (!(sourceVersion && sourceDataset)) {
        continue;
      }

      upsertLineageNode({
        nextDepth,
        nodeByVersionId,
        source,
        sourceDataset,
        sourceVersion,
      });

      if (
        shouldQueueSourceVersion(
          sourceVersion.id,
          nextDepth,
          shortestDepthByVersionId
        )
      ) {
        queue.push({
          depth: nextDepth,
          versionId: sourceVersion.id,
        });
      }
    }
  }

  return {
    nodeByVersionId,
  };
};

export const buildDatasetVersionLineageGraph = (input: {
  datasets: LineageDatasetReference[];
  selectedVersionId: string;
  sources: DatasetVersionSource[];
  versions: LineageVersionReference[];
}): DatasetVersionLineageGraph | null => {
  const datasetsById = new Map(
    input.datasets.map((dataset) => [dataset.id, dataset] as const)
  );
  const versionsById = new Map(
    input.versions.map((version) => [version.id, version] as const)
  );
  const selectedVersion = versionsById.get(input.selectedVersionId);

  if (!selectedVersion) {
    return null;
  }

  const selectedDataset = datasetsById.get(selectedVersion.datasetId);

  if (!selectedDataset) {
    return null;
  }

  const sourcesByVersionId = buildSourcesByVersionId(input.sources);

  const selectedNode = {
    datasetId: selectedDataset.id,
    datasetName: selectedDataset.name,
    datasetSlug: selectedDataset.slug,
    depth: 0,
    isSelected: true,
    relationTypes: [],
    versionId: selectedVersion.id,
    versionNumber: selectedVersion.versionNumber,
  } satisfies DatasetVersionLineageNode;
  const traversal = traverseLineageGraph({
    datasetsById,
    selectedVersionId: selectedVersion.id,
    sourcesByVersionId,
    versionsById,
  });
  const nodeByVersionId = traversal.nodeByVersionId;

  nodeByVersionId.set(selectedVersion.id, selectedNode);

  const nodes = Array.from(nodeByVersionId.values()).sort(
    (leftNode, rightNode) => {
      if (leftNode.depth !== rightNode.depth) {
        return leftNode.depth - rightNode.depth;
      }

      if (leftNode.datasetName !== rightNode.datasetName) {
        return leftNode.datasetName.localeCompare(rightNode.datasetName);
      }

      return rightNode.versionNumber - leftNode.versionNumber;
    }
  );

  const relationTypes = Array.from(
    new Set(
      nodes
        .flatMap((node) => node.relationTypes)
        .filter((value) => value.length > 0)
    )
  ).sort((leftType, rightType) => leftType.localeCompare(rightType));

  return {
    directSourceCount: (sourcesByVersionId.get(selectedVersion.id) ?? [])
      .length,
    maxDepth: nodes.reduce((currentMaxDepth, node) => {
      return Math.max(currentMaxDepth, node.depth);
    }, 0),
    nodes,
    relationTypes,
    totalAncestorCount: Math.max(nodes.length - 1, 0),
  };
};

export const buildDatasetVersionComparisonSummary = (input: {
  baselineChangeSummary: string | null;
  baselineColumns: DatasetColumnDefinition[];
  baselineNotes: string | null;
  baselineRowCount: number;
  baselineSources: DatasetVersionSource[];
  candidateChangeSummary: string | null;
  candidateColumns: DatasetColumnDefinition[];
  candidateNotes: string | null;
  candidateRowCount: number;
  candidateSources: DatasetVersionSource[];
  datasets: LineageDatasetReference[];
  versions: LineageVersionReference[];
}): DatasetVersionComparisonSummary => {
  const baselineColumnsByKey = new Map(
    input.baselineColumns.map((column) => [column.key, column] as const)
  );
  const candidateColumnsByKey = new Map(
    input.candidateColumns.map((column) => [column.key, column] as const)
  );

  const addedColumns = input.candidateColumns
    .filter((column) => !baselineColumnsByKey.has(column.key))
    .map((column) => getColumnLabel(column))
    .sort((leftColumn, rightColumn) => leftColumn.localeCompare(rightColumn));
  const removedColumns = input.baselineColumns
    .filter((column) => !candidateColumnsByKey.has(column.key))
    .map((column) => getColumnLabel(column))
    .sort((leftColumn, rightColumn) => leftColumn.localeCompare(rightColumn));
  const typeChanges = input.candidateColumns
    .map((column) => {
      const baselineColumn = baselineColumnsByKey.get(column.key);

      if (!(baselineColumn && baselineColumn.dataType !== column.dataType)) {
        return null;
      }

      return {
        fieldKey: column.key,
        fromDataType: baselineColumn.dataType,
        toDataType: column.dataType,
      } satisfies DatasetVersionTypeChange;
    })
    .filter((value): value is DatasetVersionTypeChange => Boolean(value))
    .sort((leftChange, rightChange) => {
      return leftChange.fieldKey.localeCompare(rightChange.fieldKey);
    });

  const datasetsById = new Map(
    input.datasets.map((dataset) => [dataset.id, dataset] as const)
  );
  const versionsById = new Map(
    input.versions.map((version) => [version.id, version] as const)
  );
  const baselineSourceLabels = new Set(
    input.baselineSources
      .map((source) => {
        return getSourceLabel(
          source.sourceDatasetVersionId,
          datasetsById,
          versionsById
        );
      })
      .filter((value): value is string => Boolean(value))
  );
  const candidateSourceLabels = new Set(
    input.candidateSources
      .map((source) => {
        return getSourceLabel(
          source.sourceDatasetVersionId,
          datasetsById,
          versionsById
        );
      })
      .filter((value): value is string => Boolean(value))
  );

  const addedLineageSources = Array.from(candidateSourceLabels)
    .filter((label) => !baselineSourceLabels.has(label))
    .sort((leftSource, rightSource) => leftSource.localeCompare(rightSource));
  const removedLineageSources = Array.from(baselineSourceLabels)
    .filter((label) => !candidateSourceLabels.has(label))
    .sort((leftSource, rightSource) => leftSource.localeCompare(rightSource));

  return {
    addedColumns,
    addedLineageSources,
    changeSummaryChanged:
      normalizeOptionalText(input.baselineChangeSummary) !==
      normalizeOptionalText(input.candidateChangeSummary),
    notesChanged:
      normalizeOptionalText(input.baselineNotes) !==
      normalizeOptionalText(input.candidateNotes),
    removedColumns,
    removedLineageSources,
    rowCountDelta: input.candidateRowCount - input.baselineRowCount,
    typeChanges,
  };
};
