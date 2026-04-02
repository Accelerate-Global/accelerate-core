const publicAuthHighlights = [
  {
    description:
      "Accounts are provisioned intentionally so shared research stays with the right collaborators.",
    title: "Invite-only access",
  },
  {
    description:
      "Magic links keep sign-in simple while respecting the email tied to your authorized account.",
    title: "Secure entry",
  },
] as const;

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
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,30rem)] lg:gap-10 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#262531]/10 bg-[#262531] px-6 py-8 text-[#f7f6ef] shadow-[0_30px_90px_rgba(38,37,49,0.20)] sm:px-8 sm:py-10 lg:flex lg:min-h-[calc(100vh-4rem)] lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-10 size-40 rounded-full bg-[#fcab2a]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-12 left-0 h-40 w-40 rounded-full bg-[#cad3b8]/15 blur-3xl"
          />
          <div className="relative space-y-8">
            <div className="space-y-4">
              <p className="inline-flex rounded-full border border-[#f7f6ef]/12 bg-[#f7f6ef]/8 px-3 py-1 font-medium text-[#cad3b8] text-xs uppercase tracking-[0.2em]">
                Accelerate Global
              </p>
              <div className="space-y-4">
                <p className="font-medium text-[#fcab2a] text-sm uppercase tracking-[0.18em]">
                  Invite-only data workspace
                </p>
                <h1 className="max-w-3xl font-semibold text-4xl tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                  Data to discipleship starts with trusted access.
                </h1>
                <p className="max-w-2xl text-[#f7f6ef]/78 text-base leading-7 sm:text-lg">
                  Accelerate Global equips local believers, mission partners,
                  and research collaborators with shared visibility into
                  unengaged peoples. This entry point is reserved for invited or
                  already provisioned accounts.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {publicAuthHighlights.map((highlight) => (
                <div
                  className="rounded-2xl border border-[#f7f6ef]/10 bg-[#f7f6ef]/8 p-5"
                  key={highlight.title}
                >
                  <h2 className="font-medium text-lg tracking-tight">
                    {highlight.title}
                  </h2>
                  <p className="mt-2 text-[#f7f6ef]/72 text-sm leading-6">
                    {highlight.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mt-8 border-[#f7f6ef]/10 border-t pt-6 text-[#f7f6ef]/72 text-sm leading-6">
            Use the email tied to your invite or existing authorized profile. If
            access was recently granted, the same address should work here
            without creating a new account.
          </div>
        </section>
        <section className="flex items-center lg:py-6">
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
