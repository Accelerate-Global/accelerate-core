import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";

interface AdminModuleShellProps {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  route: string;
  title: string;
}

export const AdminModuleShell = ({
  actions,
  children,
  description,
  route,
  title,
}: AdminModuleShellProps) => {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          description={description}
          route={route}
          title={title}
          zone="Admin"
        />
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
};
