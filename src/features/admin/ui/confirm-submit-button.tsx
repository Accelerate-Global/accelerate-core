"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

interface ConfirmSubmitButtonProps {
  confirmLabel?: string;
  disabled?: boolean;
  idleLabel: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

const ConfirmSubmitButtonContent = ({
  confirmLabel = "Confirm",
  disabled = false,
  idleLabel,
  variant = "outline",
}: ConfirmSubmitButtonProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const { pending } = useFormStatus();

  if (!isConfirming) {
    return (
      <Button
        disabled={disabled || pending}
        onClick={() => {
          setIsConfirming(true);
        }}
        size="sm"
        type="button"
        variant={variant}
      >
        <AlertTriangle aria-hidden="true" />
        {idleLabel}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button disabled={disabled || pending} size="sm" type="submit">
        {pending ? "Working..." : confirmLabel}
      </Button>
      <Button
        disabled={pending}
        onClick={() => {
          setIsConfirming(false);
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        Cancel
      </Button>
    </div>
  );
};

export const ConfirmSubmitButton = (props: ConfirmSubmitButtonProps) => {
  return <ConfirmSubmitButtonContent {...props} />;
};
