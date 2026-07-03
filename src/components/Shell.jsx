import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Search, Menu, X } from "lucide-react";
import { NAV_GROUPS, NAV_ITEMS } from "../lib/nav.js";
import { useUiStore } from "../store/uiStore.js";
import CommandPalette from "./CommandPalette.jsx";
import InspectorDrawer from "./InspectorDrawer.jsx";
import ToastHost from "./ToastHost.jsx";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

// Primary destinations for the mobile bottom bar; the rest live behind "More".
const MOBILE_PRIMARY = ["/", "/command", "/capital", "/inbox"];

export default function Shell({ children }) {
  const location = useLocation();
  const navMinimized = useUiStore((s) => s.navMinimized);
  const toggleNav = useUiStore((s) => s.toggleNav);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const [mobileMenu, setMobileMenu] = useState(false);

  const activeItem =
    NAV_ITEMS.find((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to))) ?? NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  const primary = MOBILE_PRIMARY.map((to) => NAV_ITEMS.find((i) => i.to === to)).filter(Boolean);

  return (
    <div className="grain min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-onPrimary"
      >
        Skip to content
      </a>

      {/* ------------------------------------------------------------- header */}
      <header className="sticky top-0 z-50 border-b border-outlineVariant/80 bg-surface/88 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleNav}
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceContainer text-paper/64 transition hover:border-outline hover:text-paper lg:grid"
              aria-label={navMinimized ? "Expand sidebar" : "Minimize sidebar"}
              aria-expanded={!navMinimized}
            >
              {navMinimized ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenu(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceContainer text-paper/64 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <NavLink to="/" className="group flex min-w-0 items-center gap-3" aria-label="Horizon OS home">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-primary/20 bg-primary text-sm font-black text-onPrimary shadow-rule transition-transform group-hover:scale-105">
                H
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate font-display text-xl font-bold leading-none tracking-tight">Horizon OS</span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.28em] text-paper/56">24 month command deck</span>
              </span>
            </NavLink>

            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 lg:flex">
              <ActiveIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate text-sm font-black text-paper">{activeItem.label}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40 xl:inline">{activeItem.detail}</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 text-paper/56 transition hover:border-outline hover:text-paper"
              aria-label="Open command palette"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden text-sm font-bold sm:inline">Search</span>
              <kbd className="hidden rounded border border-outlineVariant bg-surface px-1.5 py-0.5 font-mono text-[10px] text-paper/48 sm:inline">
                {isMac ? "⌘" : "Ctrl"} K
              </kbd>
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-outlineVariant bg-secondaryContainer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/70 md:flex">
              <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_18px_rgba(31,191,143,0.8)]" />
              Full-time build mode
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- body grid */}
      <div
        className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[var(--horizon-sidebar-width)_minmax(0,1fr)]"
        style={{ "--horizon-sidebar-width": navMinimized ? "4.75rem" : "15.5rem" }}
      >
        <aside
          className={`hz-scroll sticky top-16 hidden h-[calc(100vh-4rem)] min-h-0 flex-col overflow-y-auto border-r border-outlineVariant/80 bg-surface/64 py-4 backdrop-blur-xl transition-[padding] lg:flex ${
            navMinimized ? "px-2" : "px-3"
          }`}
        >
          <nav className="grid gap-5" aria-label="Primary">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="grid gap-1.5">
                <p className={`px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass ${navMinimized ? "sr-only" : ""}`}>
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.items.map((item) => (
                    <SidebarItem key={item.to} item={item} minimized={navMinimized} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-auto px-2 pt-4">
            <button
              type="button"
              onClick={toggleNav}
              className={`flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/40 transition hover:text-paper ${
                navMinimized ? "justify-center" : ""
              }`}
            >
              {navMinimized ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Minimize</>}
            </button>
          </div>
        </aside>

        <main id="main" className="min-w-0 px-3 py-4 sm:px-5 lg:py-6 2xl:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="mx-auto w-full max-w-[110rem]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* --------------------------------------------------------- mobile bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outlineVariant bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden" aria-label="Mobile primary">
        <div className="mx-auto flex max-w-xl items-stretch justify-around gap-1">
          {primary.map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}
          <button
            type="button"
            onClick={() => setMobileMenu(true)}
            className="flex min-h-12 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold text-paper/56"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>
      <div className="h-20 lg:hidden" />

      {/* ------------------------------------------------------- mobile sheet */}
      <AnimatePresence>
        {mobileMenu ? (
          <>
            <motion.div className="fixed inset-0 z-[85] bg-paper/25 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenu(false)} aria-hidden="true" />
            <motion.div
              className="hz-scroll fixed inset-x-0 bottom-0 z-[86] max-h-[80vh] overflow-y-auto rounded-t-[var(--hz-radius-xl)] border-t border-outlineVariant bg-surface p-5 pb-8 lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-lg font-bold text-paper">Navigate</p>
                <button type="button" onClick={() => setMobileMenu(false)} className="grid h-8 w-8 place-items-center rounded-md border border-outlineVariant text-paper/56" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass">{group.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === "/"}
                          onClick={() => setMobileMenu(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-black ${
                              isActive ? "border-primary/30 bg-primaryContainer text-onPrimaryContainer" : "border-outlineVariant bg-surfaceVariant text-paper/70"
                            }`
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <CommandPalette />
      <InspectorDrawer />
      <ToastHost />
    </div>
  );
}

function SidebarItem({ item, minimized }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={minimized ? item.label : undefined}
      className={({ isActive }) =>
        [
          "relative flex min-w-0 items-center rounded-[var(--hz-radius-sm)] border px-3 py-2.5 text-sm font-black transition",
          minimized ? "justify-center gap-0" : "gap-3",
          isActive
            ? "border-primary/20 bg-primaryContainer text-onPrimaryContainer shadow-rule"
            : "border-transparent text-paper/62 hover:border-outlineVariant hover:bg-surfaceContainer hover:text-paper",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={minimized ? "sr-only" : "min-w-0"}>
        <span className="block truncate">{item.label}</span>
        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.14em] opacity-55">{item.detail}</span>
      </span>
    </NavLink>
  );
}

function MobileTab({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        [
          "flex min-h-12 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold",
          isActive ? "bg-primaryContainer text-onPrimaryContainer" : "text-paper/56",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-full truncate">{item.label}</span>
    </NavLink>
  );
}
