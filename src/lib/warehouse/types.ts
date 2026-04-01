export interface WarehouseAdapterStatus {
  details: string[];
  isConfigured: boolean;
  key: string | null;
  missingPrerequisites: string[];
}

export interface WarehouseAdapter {
  getStatus: () => Promise<WarehouseAdapterStatus>;
}
