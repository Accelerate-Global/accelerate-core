import "server-only";

import type { AdminOversightStatus } from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

const oversightStatuses = {
  apis: {
    description:
      "API oversight is reserved for a future backing source such as confirmed external API registrations, credentials, or health views.",
    integrationNotes: [
      "Provide a confirmed API registry table, view, or external source.",
      "Confirm which status fields and diagnostics belong in the oversight UI.",
      "Wire the adapter in this module instead of adding permanent fake schema.",
    ],
    key: "apis",
    title: "APIs",
  },
  "ingestion-runs": {
    description:
      "Ingestion-run oversight needs a real run-history source before this route can move beyond placeholder depth.",
    integrationNotes: [
      "Provide a confirmed ingestion run table, view, or external operational feed.",
      "Confirm run status, timing, and failure fields.",
      "Replace the placeholder adapter implementation when the source exists.",
    ],
    key: "ingestion-runs",
    title: "Ingestion Runs",
  },
  "pipeline-runs": {
    description:
      "Pipeline-run oversight needs a real orchestration or run-history source before the page can render live diagnostics.",
    integrationNotes: [
      "Provide a confirmed pipeline run table, view, or external operational feed.",
      "Confirm run lineage, failure, and retry metadata.",
      "Replace the placeholder adapter implementation when the source exists.",
    ],
    key: "pipeline-runs",
    title: "Pipeline Runs",
  },
} as const satisfies Record<AdminOversightStatus["key"], AdminOversightStatus>;

export const loadAdminOversightPage = async (
  key: AdminOversightStatus["key"]
): Promise<AdminOversightStatus> => {
  await requireCurrentUserAdmin();

  // TODO(phase-6): Replace this placeholder adapter with a real data source
  // once the repository gains confirmed backing tables, views, or external
  // operational integrations for these admin oversight surfaces.
  return oversightStatuses[key];
};
