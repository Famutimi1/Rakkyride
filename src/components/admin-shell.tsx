"use client";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { RecordSearch } from "./record-search";
import type { StaffSearchHit } from "@/contracts/admin";
import { SearchField } from "./ui/search-field";
import { Dropdown } from "./ui/dropdown";
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
  previewRecords,
}: {
  children: ReactNode;
  preview: boolean;
  staffName?: string;
  staffRole?: string;
  environment: string;
  previewRecords?: StaffSearchHit[];
}) {
  const pathname = usePathname();
  const {
    theme,
    setTheme,
    menuOpen,
    setMenuOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useUiStore();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"pages" | "records">("pages");
  const [mobile, setMobile] = useState(false);
  const [compactDefault, setCompactDefault] = useState(false);
  const collapsed = sidebarCollapsed ?? compactDefault;
  const sidebar = useRef<HTMLElement>(null);
  const navTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width:767px)");
    const compact = matchMedia("(max-width:1279px)");
    const changed = () => {
      setMobile(media.matches);
      setCompactDefault(compact.matches);
    };
    changed();
    media.addEventListener("change", changed);
    compact.addEventListener("change", changed);
    return () => {
      media.removeEventListener("change", changed);
      compact.removeEventListener("change", changed);
    };
  }, []);
  useEffect(() => {
    if (!mobile || !menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const elements = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled),input:not(:disabled)",
        ) ?? [],
      );
    elements()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === "Tab") {
        const items = elements(),
          first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
      navTrigger.current?.focus();
    };
  }, [mobile, menuOpen, setMenuOpen]);
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
    <div
      className={`app-shell ${collapsed ? "sidebar-is-collapsed" : ""}`}
      data-sidebar={
        sidebarCollapsed === null
          ? "auto"
          : collapsed
            ? "collapsed"
            : "expanded"
      }
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && menuOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="dashboard-sidebar"
        ref={sidebar}
        inert={mobile && !menuOpen}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile && menuOpen ? true : undefined}
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="icon-button sidebar-close"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        >
          <Icon name="close" />
        </button>
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
                  aria-label={label}
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
            <Dropdown
              aria-label="Appearance"
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </Dropdown>
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
      <div className="workspace" inert={mobile && menuOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              type="button"
              className="icon-button sidebar-toggle"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              aria-controls="dashboard-sidebar"
              onClick={() => setSidebarCollapsed(!collapsed)}
            >
              <Icon name={collapsed ? "sidebar-expand" : "sidebar-collapse"} />
            </button>
            <button
              ref={navTrigger}
              className="icon-button menu-button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls="dashboard-sidebar"
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
              aria-label="Search workspace"
              onClick={() => {
                setSearchOpen(true);
                dialog.current?.showModal();
              }}
            >
              <Icon name="search" />
              <span>Search workspace</span>
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
            : "Staff workspace · Authorized snapshots. Sensitive actions follow your role and rollout settings."}
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
      <Dialog
        dialogRef={dialog}
        className="search-dialog"
        title="Search workspace"
        closeLabel="Close search"
        onClose={() => {
          setSearchOpen(false);
          setSearch("");
        }}
      >
        <div className="search-mode" role="group" aria-label="Search mode">
          <Button
            type="button"
            aria-pressed={searchMode === "pages"}
            onClick={() => setSearchMode("pages")}
          >
            Pages
          </Button>
          <Button
            type="button"
            aria-pressed={searchMode === "records"}
            onClick={() => setSearchMode("records")}
          >
            Records
          </Button>
        </div>
        {searchOpen && searchMode === "records" && (
          <RecordSearch
            preview={preview}
            allowSafety={preview || staffRole === "super_admin"}
            previewRecords={previewRecords}
            onNavigate={() => dialog.current?.close()}
          />
        )}
        {searchMode === "pages" && (
          <>
            <SearchField
              autoFocus
              label="Search dashboard pages"
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
          </>
        )}
      </Dialog>
    </div>
  );
}
