"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AuthControls } from "../../lib/auth/AuthControls";
import { IconHome, IconPlug, IconResources, IconRuns, IconTable } from "./icons";
import { PRIMARY_NAV_ITEMS, getSection, getSectionSubnav, getSectionTitle, isActivePath } from "./navigation";

function iconForPath(href: string): ReactNode {
  if (href === "/") return <IconHome />;
  if (href === "/connectors") return <IconPlug />;
  if (href === "/datasets") return <IconTable />;
  if (href === "/runs") return <IconRuns />;
  if (href === "/resources") return <IconResources />;
  return <IconHome />;
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

  const section = getSection(pathname);
  const showSubnav = section !== null;
  const subnav = section ? getSectionSubnav(pathname, section) : [];

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
            {PRIMARY_NAV_ITEMS.map((item) => {
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
                    {iconForPath(item.href)}
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
              <span className="subnavTitle">{getSectionTitle(section)}</span>
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
                      <span className="subnavDot" />
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
