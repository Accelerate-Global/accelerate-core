import { NextResponse } from "next/server";

import { finalizeSessionOnboarding } from "@/features/auth/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    await finalizeSessionOnboarding(user);

    // #region agent log
    fetch("http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3fada2",
      },
      body: JSON.stringify({
        sessionId: "3fada2",
        runId: "pre-fix",
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
    // #region agent log
    const msg =
      error instanceof Error ? error.message.slice(0, 180) : "unknown";
    fetch("http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "3fada2",
      },
      body: JSON.stringify({
        sessionId: "3fada2",
        runId: "pre-fix",
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
