export type ConnectorKey = string;

export type ConnectorRunContext = {
  runId: string;
  datasetSlug?: string;
};

export type ConnectorRunResult =
  | { ok: true; message?: string; output?: unknown }
  | { ok: false; message: string; errorCode?: string };

export type Connector = {
  key: ConnectorKey;
  displayName: string;
  description?: string;
  run: (ctx: ConnectorRunContext) => Promise<ConnectorRunResult>;
};

