"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

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

function shortId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function getSection(pathname: string): "connectors" | "datasets" | "runs" | null {
  if (pathname === "/connectors" || pathname.startsWith("/connectors/")) return "connectors";
  if (pathname === "/datasets" || pathname.startsWith("/datasets/")) return "datasets";
  if (pathname === "/runs" || pathname.startsWith("/runs/")) return "runs";
  return null;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarPinned, setSidebarPinned] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ag.sidebarPinned");
      if (raw === "1") setSidebarPinned(true);
    } catch {
      // ignore
    }
  }, []);

  const togglePinned = () => {
    setSidebarPinned((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("ag.sidebarPinned", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const primaryNav = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "Home", icon: <IconHome /> },
      { href: "/connectors", label: "APIs", icon: <IconPlug />, match: "prefix" },
      { href: "/datasets", label: "Datasets", icon: <IconTable />, match: "prefix" },
      { href: "/runs", label: "Runs", icon: <IconRuns />, match: "prefix" }
    ],
    []
  );

  const section = getSection(pathname);
  const showSubnav = section !== null;

  const connectorsSubnav = useMemo<NavItem[]>(
    () => [
      {
        href: "/connectors",
        label: "Overview",
        icon: <span className="subnavDot" aria-hidden="true" />,
        match: "exact"
      },
      {
        href: "/connectors/joshuaproject",
        label: "Joshua Project",
        icon: <span className="subnavDot" aria-hidden="true" />
      }
    ],
    []
  );

  const datasetsSubnav = useMemo<NavItem[]>(
    () => [
      { href: "/datasets", label: "Overview", icon: <span className="subnavDot" aria-hidden="true" />, match: "exact" },
      {
        href: "/datasets/pgic_people_groups",
        label: "PGIC People Groups",
        icon: <span className="subnavDot" aria-hidden="true" />
      }
    ],
    []
  );

  const runsSubnav = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { href: "/runs", label: "All runs", icon: <span className="subnavDot" aria-hidden="true" />, match: "exact" }
    ];
    if (pathname.startsWith("/runs/")) {
      const runId = pathname.slice("/runs/".length).split("/")[0] ?? "";
      if (runId) {
        items.push({
          href: pathname,
          label: `Run ${shortId(runId)}`,
          icon: <span className="subnavDot" aria-hidden="true" />
        });
      }
    }
    return items;
  }, [pathname]);

  const subnav = section === "connectors" ? connectorsSubnav : section === "datasets" ? datasetsSubnav : runsSubnav;

  return (
    <div className="appFrame">
      <header className="appTopbar">
        <Link className="brand" href="/" aria-label="Accelerate Global home">
          <img className="brandLogoImg" src="/brand/ag-square.png" alt="" />
          <img className="brandWordmark" src="/brand/ag-wordmark.svg" alt="" />
        </Link>
        <div className="topbarSpacer" />
        <AuthControls />
      </header>

      <div className={`appBody ${showSubnav ? "hasSubnav" : ""}`}>
        <aside className={`sidebar ${sidebarPinned ? "sidebarPinned" : ""}`} aria-label="Primary navigation">
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
          <div className="sidebarFooter">
            <button
              type="button"
              className={`navPin ${sidebarPinned ? "navPinActive" : ""}`}
              onClick={togglePinned}
              aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
              title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              <span className="navIcon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M14 9V4h-4v5l-2 2v2h8v-2l-2-2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M12 13v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="navLabel">{sidebarPinned ? "Pinned" : "Pin"}</span>
            </button>
          </div>
        </aside>

        {showSubnav ? (
          <aside className="subnav" aria-label="Section navigation">
            <div className="subnavHeader">
              <span className="subnavTitle">
                {section === "connectors" ? "APIs" : section === "datasets" ? "Datasets" : "Runs"}
              </span>
              <span className="subnavHint muted">Select a page</span>
            </div>
            <nav className="subnavNav">
              {subnav.map((item) => {
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
