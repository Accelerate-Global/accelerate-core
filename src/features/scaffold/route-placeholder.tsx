import { PlaceholderPage } from "@/components/layout/placeholder-page";
import type { AppRoute } from "@/lib/routes";

import { placeholderDefinitions } from "./placeholder-content";

interface RoutePlaceholderProps {
  route: AppRoute;
}

export const RoutePlaceholder = ({ route }: RoutePlaceholderProps) => {
  const definition = placeholderDefinitions[route];

  return (
    <PlaceholderPage
      description={definition.description}
      futurePurpose={definition.futurePurpose}
      route={route}
      title={definition.title}
      zone={definition.zone}
    />
  );
};
