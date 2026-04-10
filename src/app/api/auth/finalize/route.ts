import { appendFileSync } from "node:fs";

import { NextResponse } from "next/server";

import { finalizeSessionOnboarding } from "@/features/auth/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";

// #region agent log
const DEBUG_LOG_PATH =
  "/Users/blake/Documents/accelerate-global/accelerate-core/.cursor/debug-3fada2.log";

const appendDebugNdjson = (payload: Record<string, unknown>): void => {
  try {
    appendFileSync(
      DEBUG_LOG_PATH,
      `${JSON.stringify({
        sessionId: "3fada2",
        timestamp: Date.now(),
        ...payload,
      })}\n`
    );
  } catch {
    // Debug-only; ignore I/O errors (e.g. read-only env).
  }
};
// #endregion

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    await finalizeSessionOnboarding(user);

    appendDebugNdjson({
      runId: "post-fix",
      hypothesisId: "H6",
      location: "api/auth/finalize/route.ts:POST:success",
      message: "finalize server ok",
      data: { ok: true },
    });

    // #region agent log
    fetch("http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3fada2",
      },
      body: JSON.stringify({
        sessionId: "3fada2",
        runId: "post-fix",
        hypothesisId: "H6",
        location: "api/auth/finalize/route.ts:POST:success",
        message: "finalize server ok",
        data: { ok: true },
        timestamp: Date.now(),
      }),
    }).catch(() => undefined);
    // #endregion

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message.slice(0, 180) : "unknown";

    appendDebugNdjson({
      runId: "post-fix",
      hypothesisId: "H6",
      location: "api/auth/finalize/route.ts:POST:catch",
      message: "finalize server error",
      data: { errorSnippet: msg },
    });

    // #region agent log
    fetch("http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3fada2",
      },
      body: JSON.stringify({
        sessionId: "3fada2",
        runId: "post-fix",
        hypothesisId: "H6",
        location: "api/auth/finalize/route.ts:POST:catch",
        message: "finalize server error",
        data: { errorSnippet: msg },
        timestamp: Date.now(),
      }),
    }).catch(() => undefined);
    // #endregion

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Finalization failed.",
        ok: false,
      },
      {
        status: 500,
      }
    );
  }
}
