interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-medium text-emerald-700 text-sm uppercase tracking-[0.12em]">
            Public / Auth Zone
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">Accelerate</h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-7">
            Invite-only authentication entry point for onboarding and returning
            user sign-in.
          </p>
        </div>
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </div>
    </main>
  );
}
