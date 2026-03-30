import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminOversightStatus } from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";

const routeByKey = {
  apis: "/app/admin/apis",
  "ingestion-runs": "/app/admin/ingestion-runs",
  "pipeline-runs": "/app/admin/pipeline-runs",
} as const satisfies Record<AdminOversightStatus["key"], string>;

export const AdminOversightPageView = ({
  description,
  integrationNotes,
  key,
  title,
}: AdminOversightStatus) => {
  return (
    <AdminModuleShell
      description={description}
      route={routeByKey[key]}
      title={title}
    >
      <Card>
        <CardHeader>
          <CardTitle>Integration boundary ready</CardTitle>
          <CardDescription>
            The admin route exists, is protected, and has a typed adapter
            boundary. Live oversight stops here until a real backing source is
            confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {integrationNotes.map((note) => (
              <li
                className="rounded-lg border bg-muted/20 px-4 py-3"
                key={note}
              >
                {note}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
