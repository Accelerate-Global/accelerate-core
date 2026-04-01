import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminApisPageData } from "@/features/admin/apis/server";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { routes } from "@/lib/routes";

const StatusBadge = ({ enabled }: { enabled: boolean }) => {
  return enabled ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
      Enabled
    </Badge>
  ) : (
    <Badge className="border-zinc-200 bg-zinc-100 text-zinc-700">
      Disabled
    </Badge>
  );
};

export const AdminApisPageView = ({
  featureFlags,
  manualPrerequisites,
  textToQuery,
  warehouse,
}: AdminApisPageData) => {
  return (
    <AdminModuleShell
      description="Admin-only experimental integrations surface for Phase 8 warehouse and text-to-query scaffolding."
      route={routes.adminApis}
      title="APIs"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Feature gates</CardTitle>
            <CardDescription>
              Experiments stay off by default and remain admin-gated until a
              human explicitly enables them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>Admin experiments</span>
              <StatusBadge enabled={featureFlags.adminExperimentsEnabled} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Text-to-query</span>
              <StatusBadge enabled={featureFlags.textToQueryEnabled} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Warehouse adapter</CardTitle>
            <CardDescription>
              Provider boundary only. No live warehouse execution is enabled in
              this phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Provider key:{" "}
              <span className="font-medium">{warehouse.key ?? "None"}</span>
            </p>
            <p>
              Configured:{" "}
              <span className="font-medium">
                {warehouse.isConfigured ? "Yes" : "No"}
              </span>
            </p>
            <div className="space-y-1 text-muted-foreground text-xs">
              {warehouse.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
            <div className="space-y-1 text-xs">
              {warehouse.missingPrerequisites.map((item) => (
                <p className="text-muted-foreground" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Text-to-query adapter</CardTitle>
            <CardDescription>
              Future text-to-query work must compile into the existing
              structured dataset query contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Provider key:{" "}
              <span className="font-medium">{textToQuery.key ?? "None"}</span>
            </p>
            <p>
              Contract target:{" "}
              <span className="font-mono text-xs">
                {textToQuery.contractTarget}
              </span>
            </p>
            <p>
              Allowlisted datasets:{" "}
              <span className="font-medium">
                {textToQuery.allowlistedDatasetIds.length > 0
                  ? textToQuery.allowlistedDatasetIds.join(", ")
                  : "None"}
              </span>
            </p>
            <div className="space-y-1 text-muted-foreground text-xs">
              {textToQuery.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
            <div className="space-y-1 text-xs">
              {textToQuery.missingPrerequisites.map((item) => (
                <p className="text-muted-foreground" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manual prerequisites</CardTitle>
          <CardDescription>
            These decisions remain human-owned before warehouse or AI
            experiments can move beyond scaffolding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {manualPrerequisites.map((item) => (
            <p className="rounded-lg border bg-muted/20 px-4 py-3" key={item}>
              {item}
            </p>
          ))}
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
