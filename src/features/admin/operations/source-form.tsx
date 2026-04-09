"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createInitialAdminActionState } from "@/features/admin/shared";

import { saveRegisteredSourceAction } from "./actions";
import { registeredSourceConnectorKind } from "./source-config";

const initialState = createInitialAdminActionState<{ sourceId: string }>();

interface RegisteredSourceFormProps {
  defaultValues: {
    description: string;
    isEnabled: boolean;
    name: string;
    range: string;
    sheetName: string;
    sourceId?: string;
    spreadsheetId: string;
  };
  mode: "create" | "edit";
}

export const RegisteredSourceForm = ({
  defaultValues,
  mode,
}: RegisteredSourceFormProps) => {
  const [state, formAction, isPending] = useActionState(
    saveRegisteredSourceAction,
    initialState
  );
  let submitLabel = "Save source";

  if (mode === "create") {
    submitLabel = "Create source";
  }

  if (isPending) {
    submitLabel = mode === "create" ? "Creating..." : "Saving...";
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input
        name="connectorKind"
        type="hidden"
        value={registeredSourceConnectorKind.googleSheets}
      />
      {defaultValues.sourceId ? (
        <input name="sourceId" type="hidden" value={defaultValues.sourceId} />
      ) : null}
      <label className="grid gap-2" htmlFor={`${mode}-source-name`}>
        <span className="font-medium text-sm">Source name</span>
        <Input
          defaultValue={defaultValues.name}
          id={`${mode}-source-name`}
          name="name"
          placeholder="Phase A Google Sheet"
          required
        />
      </label>
      <label className="grid gap-2" htmlFor={`${mode}-source-description`}>
        <span className="font-medium text-sm">Description</span>
        <Textarea
          defaultValue={defaultValues.description}
          id={`${mode}-source-description`}
          name="description"
          placeholder="Initial Google Sheets source used for admin ingestion scaffolding."
          rows={3}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2" htmlFor={`${mode}-source-spreadsheet`}>
          <span className="font-medium text-sm">Spreadsheet ID</span>
          <Input
            defaultValue={defaultValues.spreadsheetId}
            id={`${mode}-source-spreadsheet`}
            name="spreadsheetId"
            placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
            required
          />
        </label>
        <label className="grid gap-2" htmlFor={`${mode}-source-sheet`}>
          <span className="font-medium text-sm">Sheet name</span>
          <Input
            defaultValue={defaultValues.sheetName}
            id={`${mode}-source-sheet`}
            name="sheetName"
            placeholder="Sheet1"
            required
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2" htmlFor={`${mode}-source-range`}>
          <span className="font-medium text-sm">Bounded A1 range</span>
          <Input
            defaultValue={defaultValues.range}
            id={`${mode}-source-range`}
            name="range"
            placeholder="A1:Z200"
            required
          />
        </label>
        <label className="grid gap-2" htmlFor={`${mode}-source-enabled`}>
          <span className="font-medium text-sm">State</span>
          <Select
            defaultValue={defaultValues.isEnabled ? "true" : "false"}
            id={`${mode}-source-enabled`}
            name="isEnabled"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </Select>
        </label>
      </div>
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
        Registration stores only non-secret metadata. Google credentials remain
        in server-side environment variables.
      </div>
      {state.message ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {state.message}
        </div>
      ) : null}
      <Button disabled={isPending} type="submit">
        {submitLabel}
      </Button>
    </form>
  );
};
