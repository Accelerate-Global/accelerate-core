import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUserOrRedirect } from "@/lib/auth/server";

interface ProductLayoutProps {
  children: React.ReactNode;
}

export default async function ProductLayout({ children }: ProductLayoutProps) {
  await requireAuthenticatedUserOrRedirect();

  return (
    <AppShell
      shellDescription="Authenticated dataset browser"
      shellTitle="Accelerate"
      variant="product"
    >
      {children}
    </AppShell>
  );
}
