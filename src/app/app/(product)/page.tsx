import { RoutePlaceholder } from "@/features/scaffold/route-placeholder";
import { routes } from "@/lib/routes";

export default function AppHomePage() {
  return <RoutePlaceholder route={routes.appHome} />;
}
