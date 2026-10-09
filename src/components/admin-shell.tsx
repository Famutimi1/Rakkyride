"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { navigation, pageNames } from "@/lib/navigation";
import { useUiStore, type Theme } from "@/lib/ui-store";
import { Icon } from "./icon";
import { RefreshControl } from "./refresh-control";
import { BrandLogo } from "./brand-logo";
export function AdminShell({
  children,
  preview,
  staffName,
  staffRole,
  environment,
}: {
  children: ReactNode;
  preview: boolean;
  staffName?: string;
  staffRole?: string;
  environment: string;
}) {
  const pathname = usePathname();
  const { theme, setTheme, menuOpen, setMenuOpen } = useUiStore();
  const [search, setSearch] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, setMenuOpen]);
  const visibleNavigation = navigation.map((g) => ({
    ...g,
    items: g.items.filter(
      ([, href]) =>
        preview ||
        staffRole === "super_admin" ||
        !["/admin/safety", "/admin/team"].includes(href),
    ),
  }));
  const matches = visibleNavigation
    .flatMap((g) => g.items)
    .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <Link href="/admin" className="brand">
          <BrandLogo />
          <span>
            <strong>
              rakky<span className="brand-light">ride</span>
            </strong>
            <small>OPERATIONS WORKSPACE</small>
          </span>
        </Link>
        <nav>
          {visibleNavigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(([label, href, icon]) => (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-current={pathname === href ? "page" : undefined}
                  className={`nav-item ${pathname === href || (href !== "/admin" && pathname.startsWith(href + "/")) ? "active" : ""}`}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <label className="theme-control">
            <span>Appearance</span>
            <select
              aria-label="Appearance"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <div className="staff">
            <span className="avatar">{preview ? "PV" : "—"}</span>
            <div>
              <strong>
                {preview ? "Preview workspace" : (staffName ?? "Staff access")}
              </strong>
              <small>{preview ? "Sample data only" : "Authorized staff"}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <span className="muted">/</span>
            <strong>{pageNames[pathname] ?? "Record detail"}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => dialog.current?.showModal()}
            >
              <Icon name="search" />
              <span>Find a page</span>
              <kbd>⌕</kbd>
            </button>
            <span className="environment">
              <span />{" "}
              {preview ? "DEVELOPMENT PREVIEW" : environment.toUpperCase()}
            </span>
            <span className="timezone">Lagos · WAT</span>
          </div>
        </header>
        <div className="preview-strip">
          <Icon name={preview ? "file" : "lock"} size={15} />
          {preview
            ? "Development preview · All people, trips and amounts are fictional. Snapshot: 09 Oct 2026, 11:30 WAT."
            : "Staff workspace · Authorized API snapshots. Live subscriptions and mutations are not enabled."}
          <Link href="/login">
            Staff entry <span aria-hidden="true">↗</span>
          </Link>
          {!preview && (
            <button
              className="text-link"
              onClick={async () => {
                await fetch("/api/session/logout", { method: "POST" });
                location.assign("/login");
              }}
            >
              Sign out
            </button>
          )}
        </div>
        {!preview && (
          <div className="snapshot-tools">
            <RefreshControl />
          </div>
        )}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Rakky Ride Admin</span>
          <span>
            NGN · Africa/Lagos ·{" "}
            {preview ? "Fixture snapshot" : "Authorized snapshots"}
          </span>
        </footer>
      </div>
      <dialog ref={dialog} className="search-dialog">
        <div className="dialog-header">
          <h2>Find a page</h2>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p className="muted">
          Record search will require an authorized staff API.
        </p>
        <input
          autoFocus
          aria-label="Search dashboard pages"
          placeholder="Trips, drivers, payments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="search-results">
          {matches.map(([name, href, icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => dialog.current?.close()}
            >
              <Icon name={icon} />
              {name}
              <Icon name="arrow" size={15} />
            </Link>
          ))}
          {!matches.length && <p>No matching pages.</p>}
        </div>
      </dialog>
    </div>
  );
}
