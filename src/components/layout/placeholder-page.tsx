import { PageHeader } from "@/components/layout/page-header";
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
  futurePurpose: string;
  route: string;
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
  futurePurpose,
  route,
  title,
  zone,
}: PlaceholderPageProps) => {
  const styles = zoneStyles[zone];

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        description={description}
        route={route}
        title={title}
        zone={zone}
      />
      <Card className={cn("w-full border-dashed", styles.card)}>
        <CardHeader>
          <CardTitle>Foundation Placeholder</CardTitle>
          <CardDescription>
            This route exists so later phases can add auth, dataset access, and
            operational workflows without restructuring the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Future purpose</p>
            <p className="text-muted-foreground">{futurePurpose}</p>
          </div>
          <div>
            <p className="font-medium">Current status</p>
            <p className="text-muted-foreground">
              Phase 1 scaffold only. Business logic, access control, and live
              data are intentionally deferred.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export { PlaceholderPage };
