import "server-only";

const truthyValues = new Set(["1", "on", "true", "yes"]);

const parseBooleanFlag = (value: string | undefined): boolean => {
  return truthyValues.has(value?.trim().toLowerCase() ?? "");
};

const parseCsvList = (value: string | undefined): string[] => {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export interface ExperimentFeatureFlags {
  adminExperimentsEnabled: boolean;
  textToQueryEnabled: boolean;
}

export const getExperimentFeatureFlags = (): ExperimentFeatureFlags => {
  return {
    adminExperimentsEnabled: parseBooleanFlag(
      process.env.EXPERIMENTS_ADMIN_ENABLED
    ),
    textToQueryEnabled: parseBooleanFlag(
      process.env.EXPERIMENTS_TEXT_TO_QUERY_ENABLED
    ),
  };
};

export const getTextToQueryAllowlistedDatasetIds = (): string[] => {
  return parseCsvList(
    process.env.EXPERIMENT_TEXT_TO_QUERY_ALLOWLIST_DATASET_IDS
  );
};
