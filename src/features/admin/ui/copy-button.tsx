"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  className?: string;
  value: string;
}

export const CopyButton = ({ className, value }: CopyButtonProps) => {
  const [didCopy, setDidCopy] = useState(false);

  return (
    <Button
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDidCopy(true);
        window.setTimeout(() => {
          setDidCopy(false);
        }, 1500);
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      {didCopy ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {didCopy ? "Copied" : "Copy link"}
    </Button>
  );
};
