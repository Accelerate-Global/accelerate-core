import { NextResponse } from "next/server";

import { finalizeSessionOnboarding } from "@/features/auth/server";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    await finalizeSessionOnboarding(user);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
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
