export type ConnectorId = string;

export type ConnectorRunContext = {
  runId: string;
  datasetId: string;
};

export type ConnectorRunResult =
  | {
      ok: true;
      message?: string;
      output?: {
        // Stream of row objects intended for NDJSON export + BigQuery load.
        records?: AsyncIterable<Record<string, unknown>>;
      };
    }
  | { ok: false; message: string; errorCode?: string };

export type Connector = {
  id: ConnectorId;
  displayName: string;
  description?: string;
  run: (ctx: ConnectorRunContext) => Promise<ConnectorRunResult>;
};
