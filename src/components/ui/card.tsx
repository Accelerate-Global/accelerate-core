import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
      className
    )}
    data-slot="card"
    {...props}
  />
);

const CardHeader = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "grid auto-rows-min grid-rows-[auto_auto] gap-1.5 px-6",
      className
    )}
    data-slot="card-header"
    {...props}
  />
);

const CardTitle = ({ className, ...props }: ComponentProps<"h3">) => (
  <h3
    className={cn("font-semibold leading-none", className)}
    data-slot="card-title"
    {...props}
  />
);

const CardDescription = ({ className, ...props }: ComponentProps<"p">) => (
  <p
    className={cn("text-muted-foreground text-sm", className)}
    data-slot="card-description"
    {...props}
  />
);

const CardAction = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      className
    )}
    data-slot="card-action"
    {...props}
  />
);

const CardContent = ({ className, ...props }: ComponentProps<"div">) => (
  <div className={cn("px-6", className)} data-slot="card-content" {...props} />
);

const CardFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    className={cn("flex items-center px-6", className)}
    data-slot="card-footer"
    {...props}
  />
);

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
