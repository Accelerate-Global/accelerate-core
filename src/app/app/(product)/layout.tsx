import {
  ProductSidebarScaffold,
  ShellTopbarScaffold,
} from "@/components/layout/shell-scaffold";

interface ProductLayoutProps {
  children: React.ReactNode;
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/20 lg:flex">
      <ProductSidebarScaffold />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <ShellTopbarScaffold title="Product zone" />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
