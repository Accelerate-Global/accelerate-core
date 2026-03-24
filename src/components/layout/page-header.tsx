import { Badge } from "@/components/ui/badge";
import type { AppZone } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  description: string;
  route: string;
  title: string;
  zone: AppZone;
}

const zoneStyles = {
  Admin: {
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    route: "text-orange-700",
  },
  Product: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    route: "text-blue-700",
  },
  Public: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    route: "text-emerald-700",
  },
} as const;

export const PageHeader = ({
  description,
  route,
  title,
  zone,
}: PageHeaderProps) => {
  const styles = zoneStyles[zone];

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={cn("uppercase tracking-[0.12em]", styles.badge)}>
          {zone} Zone
        </Badge>
        <p className={cn("font-medium text-sm", styles.route)}>{route}</p>
      </div>
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
        <p className="max-w-3xl text-base text-muted-foreground leading-7">
          {description}
        </p>
      </div>
    </header>
  );
};
