interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}
