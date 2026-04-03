interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f6ef] text-[#262531]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(252,171,42,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(7,139,201,0.14),transparent_28%)]"
      />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-start px-4 py-6 sm:px-6 sm:py-8 lg:items-center lg:px-8">
        <section className="flex w-full items-start lg:items-center lg:py-6">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
