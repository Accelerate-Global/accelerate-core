import "server-only";

import type { WarehouseAdapter, WarehouseAdapterStatus } from "./types";

const getConfiguredWarehouseProvider = (): string | null => {
  const provider = process.env.EXPERIMENT_WAREHOUSE_PROVIDER?.trim();

  return provider ? provider : null;
};

const defaultWarehouseAdapter: WarehouseAdapter = {
  getStatus: (): Promise<WarehouseAdapterStatus> => {
    const provider = getConfiguredWarehouseProvider();
    const missingPrerequisites: string[] = [];

    if (!provider) {
      missingPrerequisites.push("Choose a warehouse provider.");
    }

    if (!process.env.EXPERIMENT_WAREHOUSE_CONNECTION_REFERENCE?.trim()) {
      missingPrerequisites.push(
        "Provide a connection or credential reference for the warehouse."
      );
    }

    return Promise.resolve({
      details: provider
        ? [`Configured provider key: ${provider}`]
        : ["No warehouse provider is configured."],
      isConfigured: missingPrerequisites.length === 0,
      key: provider,
      missingPrerequisites,
    });
  },
};

export const getWarehouseAdapterStatus =
  (): Promise<WarehouseAdapterStatus> => {
    return defaultWarehouseAdapter.getStatus();
  };
