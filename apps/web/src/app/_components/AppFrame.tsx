"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { AuthControls } from "../../lib/auth/AuthControls";
import { IconHome, IconPlug, IconRuns, IconTable } from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: "exact" | "prefix";
};

function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  if (item.match === "prefix") return pathname === item.href || pathname.startsWith(`${item.href}/`);
  // Default: exact for root, prefix otherwise.
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const primaryNav = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "Home", icon: <IconHome /> },
      { href: "/connectors", label: "APIs", icon: <IconPlug />, match: "prefix" },
      { href: "/datasets", label: "Datasets", icon: <IconTable />, match: "prefix" },
      { href: "/runs", label: "Runs", icon: <IconRuns />, match: "prefix" }
    ],
    []
  );

  const showSubnav = pathname === "/connectors" || pathname.startsWith("/connectors/");

  const connectorsSubnav = useMemo<NavItem[]>(
    () => [
      { href: "/connectors", label: "Overview", icon: <span className="subnavDot" aria-hidden="true" /> },
      {
        href: "/connectors/joshuaproject",
        label: "Joshua Project",
        icon: <span className="subnavDot" aria-hidden="true" />
      }
    ],
    []
  );

  return (
    <div className="appFrame">
      <header className="appTopbar">
        <Link className="brand" href="/" aria-label="Accelerate Global home">
          <span className="brandLogo" aria-hidden="true" />
          <span className="brandText">
            <span className="brandName">Accelerate Global</span>
            <span className="brandTag muted">Internal pipelines</span>
          </span>
        </Link>
        <div className="topbarSpacer" />
        <AuthControls />
      </header>

      <div className={`appBody ${showSubnav ? "hasSubnav" : ""}`}>
        <aside className="sidebar" aria-label="Primary navigation">
          <nav className="sidebarNav">
            {primaryNav.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`navItem ${active ? "navItemActive" : ""}`}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span className="navIcon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="navLabel">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {showSubnav ? (
          <aside className="subnav" aria-label="Section navigation">
            <div className="subnavHeader">
              <span className="subnavTitle">APIs</span>
              <span className="subnavHint muted">Choose a source</span>
            </div>
            <nav className="subnavNav">
              {connectorsSubnav.map((item) => {
                const active = isActivePath(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`subnavItem ${active ? "subnavItemActive" : ""}`}
                    aria-label={item.label}
                  >
                    <span className="subnavIcon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="subnavLabel">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main className="main" role="main">
          <div className="mainInner">{children}</div>
        </main>
      </div>
    </div>
  );
}

