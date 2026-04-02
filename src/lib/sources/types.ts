export type SourceConnectorHealth =
  | "not-configured"
  | "ready"
  | "validation-failed";

export interface SourceConnectorStatus<TKey extends string = string> {
  details: string[];
  health: SourceConnectorHealth;
  isConfigured: boolean;
  key: TKey;
  missingPrerequisites: string[];
}

export interface SourcePreviewColumn {
  key: string;
  label: string;
}

export interface SourcePreviewRow {
  cells: string[];
  index: number;
}
