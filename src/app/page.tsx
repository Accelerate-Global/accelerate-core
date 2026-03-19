import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <Card className="w-full max-w-2xl border-border/80 shadow-black/5 shadow-lg">
        <CardHeader className="space-y-4">
          <Badge className="w-fit" variant="secondary">
            Phase 1 Foundation
          </Badge>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight sm:text-4xl">
              Accelerate — Phase 1 Bootstrap
            </CardTitle>
            <CardDescription className="max-w-prose text-base">
              Next.js 15, React 19, TypeScript strict mode, Tailwind v4, and
              shadcn/ui are wired up and ready for the next ticket.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-6">
            This temporary landing page confirms the application boots and the
            shared design tokens are loading correctly.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
