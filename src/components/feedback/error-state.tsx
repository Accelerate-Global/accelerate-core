"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  className?: string;
  description?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
}

export const ErrorState = ({
  className,
  description = "Something unexpected interrupted this view. Please try again.",
  error,
  reset,
  title = "Something went wrong",
}: ErrorStateProps) => {
  const errorMessage =
    process.env.NODE_ENV === "development" ? error?.message : undefined;

  return (
    <Card
      className={cn("w-full max-w-2xl border-border/80 shadow-sm", className)}
      role="alert"
    >
      <CardHeader className="items-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="mx-auto max-w-prose text-base leading-6">
            {description}
          </CardDescription>
          {errorMessage ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-left font-mono text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </CardHeader>
      {reset ? (
        <CardFooter className="justify-center pt-0">
          <Button onClick={reset} type="button">
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
};
