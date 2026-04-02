"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const LoginFormFields = () => {
  const { pending } = useFormStatus();

  return (
    <fieldset className="grid gap-4" disabled={pending}>
      <label className="grid gap-2" htmlFor="login-email">
        <span className="font-medium text-[#262531] text-sm">
          Email address
        </span>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          className="h-12 rounded-xl border-[#262531]/12 bg-[#f7f6ef]/70 px-4 text-[#262531] text-base placeholder:text-[#262531]/42 focus-visible:border-[#078bc9]/35 focus-visible:ring-[#078bc9]/18"
          id="login-email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <span className="text-[#262531]/58 text-sm leading-6">
          Use the same email address connected to your invite or authorized
          account record.
        </span>
      </label>
      <Button
        className="h-11 w-full rounded-xl bg-[#262531] text-[#f7f6ef] hover:bg-[#262531]/92"
        type="submit"
      >
        {pending ? "Sending secure link..." : "Send secure link"}
      </Button>
      <p
        aria-live="polite"
        className="min-h-6 text-[#262531]/60 text-sm leading-6"
        role="status"
      >
        {pending
          ? "Checking your account and preparing a secure sign-in link."
          : "We only send secure links to emails already allowed into this workspace."}
      </p>
    </fieldset>
  );
};
