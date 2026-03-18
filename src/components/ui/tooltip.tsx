"use client";

import {
  Content,
  Provider,
  Root,
  Portal as TooltipPortal,
  Trigger,
} from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const TooltipProvider = Provider;

const Tooltip = Root;

const TooltipTrigger = Trigger;

type TooltipContentProps = ComponentProps<typeof Content> & {
  sideOffset?: number;
};

const TooltipContent = ({
  className,
  sideOffset = 0,
  ...props
}: TooltipContentProps) => (
  <TooltipPortal>
    <Content
      className={cn(
        "fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in text-balance rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs",
        className
      )}
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      {...props}
    />
  </TooltipPortal>
);

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
