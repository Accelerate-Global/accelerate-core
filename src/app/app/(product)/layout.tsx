import { AppShell } from "@/components/layout/app-shell";
import { getProductNavItems } from "@/components/layout/nav-items";
import { requireAuthenticatedUserOrRedirect } from "@/lib/auth/server";
import { isCurrentUserAdmin } from "@/lib/permissions/server";

interface ProductLayoutProps {
  children: React.ReactNode;
}

export default async function ProductLayout({ children }: ProductLayoutProps) {
  await requireAuthenticatedUserOrRedirect();
  const productNavItems = getProductNavItems(await isCurrentUserAdmin());

  return (
    <AppShell
      navItems={productNavItems}
      shellDescription="Authenticated dataset browser"
      shellTitle="Accelerate"
      variant="product"
    >
      {children}
    </AppShell>
  );
}
