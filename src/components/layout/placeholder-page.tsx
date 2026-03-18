import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppZone } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface PlaceholderPageProps {
  description: string;
  title: string;
  zone: AppZone;
}

const zoneStyles = {
  Admin: {
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    card: "border-orange-200 bg-orange-50/40",
  },
  Product: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-blue-200 bg-blue-50/40",
  },
  Public: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-200 bg-emerald-50/40",
  },
} as const;

const PlaceholderPage = ({
  description,
  title,
  zone,
}: PlaceholderPageProps) => {
  const styles = zoneStyles[zone];

  return (
    <section className="mx-auto flex w-full max-w-3xl justify-center">
      <Card className={cn("w-full border-dashed", styles.card)}>
        <CardHeader className="items-center text-center">
          <Badge className={cn("uppercase tracking-[0.12em]", styles.badge)}>
            {zone} Zone
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm">
          This page is scaffolded for Phase 1 and will be implemented in a later
          ticket.
        </CardContent>
      </Card>
    </section>
  );
};

export { PlaceholderPage };
