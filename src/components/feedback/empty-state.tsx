import type { ReactNode } from "react";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  action?: ReactNode;
  className?: string;
  description: string;
  icon?: ReactNode;
  title: string;
}

export const EmptyState = ({
  action,
  className,
  description,
  icon,
  title,
}: EmptyStateProps) => {
  return (
    <Card
      className={cn("w-full max-w-2xl border-border/80 shadow-sm", className)}
    >
      <CardHeader className="items-center space-y-4 text-center">
        {icon ? (
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="mx-auto max-w-prose text-base leading-6">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      {action ? (
        <CardFooter className="justify-center pt-0">{action}</CardFooter>
      ) : null}
    </Card>
  );
};
