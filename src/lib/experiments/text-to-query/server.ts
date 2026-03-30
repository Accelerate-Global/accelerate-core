import "server-only";

import { getTextToQueryAllowlistedDatasetIds } from "@/lib/experiments/feature-flags";

import type { TextToQueryAdapter, TextToQueryStatus } from "./types";

const getConfiguredTextToQueryProvider = (): string | null => {
  const provider = process.env.EXPERIMENT_TEXT_TO_QUERY_PROVIDER?.trim();

  return provider ? provider : null;
};

const defaultTextToQueryAdapter: TextToQueryAdapter = {
  getStatus: (): Promise<TextToQueryStatus> => {
    const provider = getConfiguredTextToQueryProvider();
    const allowlistedDatasetIds = getTextToQueryAllowlistedDatasetIds();
    const missingPrerequisites: string[] = [];

    if (!provider) {
      missingPrerequisites.push("Choose a text-to-query model provider.");
    }

    if (allowlistedDatasetIds.length === 0) {
      missingPrerequisites.push(
        "Allowlist at least one dataset before enabling experiments."
      );
    }

    if (!process.env.EXPERIMENT_TEXT_TO_QUERY_LOG_REFERENCE?.trim()) {
      missingPrerequisites.push(
        "Choose where prompt and evaluation logs should be written."
      );
    }

    return Promise.resolve({
      allowlistedDatasetIds,
      contractTarget: "features/datasets/query-contract.ts",
      details: provider
        ? [
            `Configured provider key: ${provider}`,
            "Future generations must compile into the structured dataset query contract.",
          ]
        : [
            "No text-to-query provider is configured.",
            "Future generations must compile into the structured dataset query contract.",
          ],
      isConfigured: missingPrerequisites.length === 0,
      key: provider,
      missingPrerequisites,
    });
  },
};

export const getTextToQueryStatus = (): Promise<TextToQueryStatus> => {
  return defaultTextToQueryAdapter.getStatus();
};
