import type {
  DatasetFilter,
  DatasetSort,
} from "@/features/datasets/query-contract";

export interface TextToQueryStructuredQueryDraft {
  datasetId: string;
  filters: DatasetFilter[];
  page: number;
  pageSize: number;
  sort: DatasetSort[];
  versionId?: string;
}

export interface TextToQueryStatus {
  allowlistedDatasetIds: string[];
  contractTarget: string;
  details: string[];
  isConfigured: boolean;
  key: string | null;
  missingPrerequisites: string[];
}

export interface TextToQueryAdapter {
  getStatus: () => Promise<TextToQueryStatus>;
}
