import "server-only";

import { requireCurrentUserAdmin } from "@/lib/auth/server";
import { getExperimentFeatureFlags } from "@/lib/experiments/feature-flags";
import { getTextToQueryStatus } from "@/lib/experiments/text-to-query/server";
import type { TextToQueryStatus } from "@/lib/experiments/text-to-query/types";
import { getWarehouseAdapterStatus } from "@/lib/warehouse/server";
import type { WarehouseAdapterStatus } from "@/lib/warehouse/types";

export interface AdminApisPageData {
  featureFlags: {
    adminExperimentsEnabled: boolean;
    textToQueryEnabled: boolean;
  };
  manualPrerequisites: string[];
  textToQuery: Awaited<ReturnType<typeof getTextToQueryStatus>>;
  warehouse: Awaited<ReturnType<typeof getWarehouseAdapterStatus>>;
}

const getDisabledWarehouseStatus = (
  reason: string,
  currentStatus: WarehouseAdapterStatus
): WarehouseAdapterStatus => {
  return {
    details: [reason],
    isConfigured: false,
    key: null,
    missingPrerequisites: [reason, ...currentStatus.missingPrerequisites],
  };
};

const getDisabledTextToQueryStatus = (
  reason: string,
  currentStatus: TextToQueryStatus
): TextToQueryStatus => {
  return {
    allowlistedDatasetIds: [],
    contractTarget: currentStatus.contractTarget,
    details: [reason],
    isConfigured: false,
    key: null,
    missingPrerequisites: [reason, ...currentStatus.missingPrerequisites],
  };
};

export const loadAdminApisPage = async (): Promise<AdminApisPageData> => {
  await requireCurrentUserAdmin();
  const featureFlags = getExperimentFeatureFlags();

  const [warehouseStatus, textToQueryStatus] = await Promise.all([
    getWarehouseAdapterStatus(),
    getTextToQueryStatus(),
  ]);
  const warehouse = featureFlags.adminExperimentsEnabled
    ? warehouseStatus
    : getDisabledWarehouseStatus(
        "Admin experiments are disabled by feature flag.",
        warehouseStatus
      );
  const textToQuery =
    featureFlags.adminExperimentsEnabled && featureFlags.textToQueryEnabled
      ? textToQueryStatus
      : getDisabledTextToQueryStatus(
          featureFlags.adminExperimentsEnabled
            ? "Text-to-query is disabled by feature flag."
            : "Admin experiments are disabled by feature flag.",
          textToQueryStatus
        );

  return {
    featureFlags,
    manualPrerequisites: [
      "Choose a warehouse provider and provision credentials outside the app.",
      "Choose a model provider and define evaluation criteria before enabling text-to-query experiments.",
      "Approve allowlisted datasets and columns through product and governance review before enabling any live experiment.",
      "Keep future text-to-query work compiled into the structured dataset query contract instead of raw SQL.",
    ],
    textToQuery,
    warehouse,
  };
};
