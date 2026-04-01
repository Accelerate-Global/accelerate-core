import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Select = ({ className, ...props }: ComponentProps<"select">) => {
  return (
    <select
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      data-slot="select"
      {...props}
    />
  );
};

export { Select };
