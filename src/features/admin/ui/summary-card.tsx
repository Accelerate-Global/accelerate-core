import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SummaryCardProps {
  description: string;
  icon?: ReactNode;
  title: string;
  value: string;
}

export const SummaryCard = ({
  description,
  icon,
  title,
  value,
}: SummaryCardProps) => {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {icon ? (
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-3xl tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
};
