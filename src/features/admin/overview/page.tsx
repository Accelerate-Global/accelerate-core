import {
  ArrowRight,
  Database,
  FolderKanban,
  KeyRound,
  MailPlus,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminDashboardSummary } from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { SummaryCard } from "@/features/admin/ui/summary-card";
import { routes } from "@/lib/routes";

const quickLinks = [
  {
    description: "Inspect roles and workspace context.",
    href: routes.adminUsers,
    icon: Users,
    title: "Users",
  },
  {
    description: "Issue and replace invite links.",
    href: routes.adminInvites,
    icon: MailPlus,
    title: "Invites",
  },
  {
    description: "Review dataset grants and access context.",
    href: routes.adminPermissions,
    icon: KeyRound,
    title: "Permissions",
  },
  {
    description: "Manage visibility and default-global behavior.",
    href: routes.adminDatasets,
    icon: Database,
    title: "Datasets",
  },
  {
    description: "Activate dataset versions safely.",
    href: routes.adminPublishing,
    icon: Send,
    title: "Publishing",
  },
  {
    description: "Inspect admin-gated experimental integration readiness.",
    href: routes.adminApis,
    icon: FolderKanban,
    title: "APIs",
  },
  {
    description: "Bounded placeholder for future operational oversight.",
    href: routes.adminPipelineRuns,
    icon: FolderKanban,
    title: "Operations",
  },
] as const;

export const AdminDashboardPageView = ({
  acceptedInviteCount,
  datasetCount,
  defaultGlobalActiveVersionNumber,
  defaultGlobalDatasetName,
  hasDefaultGlobalDataset,
  pendingInviteCount,
  privateDatasetCount,
  sharedDatasetCount,
  totalUserCount,
  workspaceDatasetCount,
}: AdminDashboardSummary) => {
  return (
    <AdminModuleShell
      description="Operational overview for user administration, invite posture, dataset visibility, and version activation."
      route={routes.adminHome}
      title="Overview"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          description="Profiles currently registered in the app."
          icon={<Users aria-hidden="true" className="size-4" />}
          title="Users"
          value={totalUserCount.toLocaleString()}
        />
        <SummaryCard
          description="Pending manual-delivery invite links."
          icon={<MailPlus aria-hidden="true" className="size-4" />}
          title="Pending invites"
          value={pendingInviteCount.toLocaleString()}
        />
        <SummaryCard
          description="Datasets currently tracked in the catalog."
          icon={<Database aria-hidden="true" className="size-4" />}
          title="Datasets"
          value={datasetCount.toLocaleString()}
        />
        <SummaryCard
          description={
            hasDefaultGlobalDataset
              ? `Current home dataset: ${defaultGlobalDatasetName}`
              : "No default global dataset is configured."
          }
          icon={<Send aria-hidden="true" className="size-4" />}
          title="Home dataset"
          value={
            hasDefaultGlobalDataset
              ? `v${defaultGlobalActiveVersionNumber ?? "?"}`
              : "None"
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Invite posture</CardTitle>
            <CardDescription>
              Pending invites need manual delivery. Accepted invite rows remain
              as history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{pendingInviteCount.toLocaleString()} pending invites</p>
            <p>{acceptedInviteCount.toLocaleString()} accepted invites</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dataset visibility</CardTitle>
            <CardDescription>
              Current catalog distribution across the grounded visibility model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{privateDatasetCount.toLocaleString()} private datasets</p>
            <p>{sharedDatasetCount.toLocaleString()} shared datasets</p>
            <p>{workspaceDatasetCount.toLocaleString()} workspace datasets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Default global dataset</CardTitle>
            <CardDescription>
              This dataset drives the current `/app` home experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {defaultGlobalDatasetName ??
                "No default global dataset configured."}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.adminPublishing}>
                Open publishing
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((link) => (
          <Card key={link.href}>
            <CardHeader className="gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <link.icon aria-hidden="true" className="size-4" />
                </div>
                <CardTitle className="text-base">{link.title}</CardTitle>
              </div>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={link.href}>
                  Open {link.title.toLowerCase()}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminModuleShell>
  );
};
