export type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

export type AppSection = "connectors" | "datasets" | "runs" | "resources";

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/connectors", label: "APIs", match: "prefix" },
  { href: "/datasets", label: "Datasets", match: "prefix" },
  { href: "/runs", label: "Runs", match: "prefix" },
  { href: "/resources", label: "Resources", match: "prefix" }
];

export function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.match === "prefix") return pathname === item.href || pathname.startsWith(`${item.href}/`);
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getSection(pathname: string): AppSection | null {
  if (pathname === "/connectors" || pathname.startsWith("/connectors/")) return "connectors";
  if (pathname === "/datasets" || pathname.startsWith("/datasets/")) return "datasets";
  if (pathname === "/runs" || pathname.startsWith("/runs/")) return "runs";
  if (pathname === "/resources" || pathname.startsWith("/resources/")) return "resources";
  return null;
}

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 10)}…`;
}

export function getSectionSubnav(pathname: string, section: AppSection): NavItem[] {
  if (section === "connectors") {
    return [
      { href: "/connectors", label: "Overview", match: "exact" },
      { href: "/connectors/joshuaproject", label: "Joshua Project" }
    ];
  }

  if (section === "datasets") {
    return [
      { href: "/datasets", label: "Overview", match: "exact" },
      { href: "/datasets/pgic_people_groups", label: "PGIC People Groups" }
    ];
  }

  if (section === "runs") {
    const items: NavItem[] = [{ href: "/runs", label: "All runs", match: "exact" }];
    if (pathname.startsWith("/runs/")) {
      const runId = pathname.slice("/runs/".length).split("/")[0] ?? "";
      if (runId) items.push({ href: pathname, label: `Run ${shortId(runId)}` });
    }
    return items;
  }

  const items: NavItem[] = [
    { href: "/resources", label: "Overview", match: "exact" },
    { href: "/resources/tables", label: "Resource Tables", match: "exact" }
  ];

  if (pathname.startsWith("/resources/tables/")) {
    const parts = pathname.slice("/resources/tables/".length).split("/");
    const slug = parts[0] ?? "";
    if (slug) {
      items.push({
        href: `/resources/tables/${slug}`,
        label: `Table ${shortId(slug)}`,
        match: "exact"
      });
      items.push({
        href: `/resources/tables/${slug}/versions`,
        label: "Versions",
        match: "prefix"
      });
    }
  }

  return items;
}

export function getSectionTitle(section: AppSection): string {
  if (section === "connectors") return "APIs";
  if (section === "datasets") return "Datasets";
  if (section === "runs") return "Runs";
  return "Resources";
}
