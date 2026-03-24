import { AppShell } from "@/components/layout/app-shell";

interface ProductLayoutProps {
  children: React.ReactNode;
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return (
    <AppShell
      shellDescription="Authenticated product zone"
      shellTitle="Accelerate"
      variant="product"
    >
      {children}
    </AppShell>
  );
}
