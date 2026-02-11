export const COLLECTIONS = {
  runs: "runs",
  datasets: "datasets",
  connectors: "connectors",
  datasetVersions: "dataset_versions",
  resources: "resources",
  resourceVersions: "resource_versions",
  runLeases: "runLeases"
} as const;

export const SUBCOLLECTIONS = {
  versions: "versions",
  logs: "logs"
} as const;
