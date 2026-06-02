import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  BookOpen,
  FileText,
  Gauge,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Rocket,
  Wallet,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Command", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/projects", label: "Hub", icon: Gauge },
  { to: "/journey", label: "Journey", icon: BookOpen },
  { to: "/capital", label: "Capital", icon: Wallet },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/map", label: "Map", icon: GitBranch },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/hskg", label: "HSKG", icon: Rocket },
];

export default function Shell({ children }) {
  const location = useLocation();

  return (
    <div className="grain min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-onPrimary"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-outlineVariant/80 bg-surface/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <NavLink to="/" className="group flex min-w-0 items-center gap-3" aria-label="Horizon OS home">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-primary/20 bg-primary text-sm font-black text-onPrimary shadow-rule transition-transform group-hover:scale-105">
              H
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold leading-none tracking-tight">
                Horizon OS
              </span>
              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.28em] text-paper/56">
                24 month command deck
              </span>
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {navItems.map((item) => (
              <DesktopNavItem key={item.to} item={item} />
            ))}
          </nav>

          <div className="hidden items-center gap-2 rounded-full border border-outlineVariant bg-secondaryContainer px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70 sm:flex">
            <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_18px_rgba(31,191,143,0.8)]" />
            Full-time build mode
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-outlineVariant bg-surface/94 px-2 pb-2 pt-2 backdrop-blur-xl lg:hidden"
        aria-label="Mobile primary"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-9 gap-1">
          {navItems.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}
        </div>
      </nav>
      <div className="h-20 lg:hidden" />
    </div>
  );
}

function DesktopNavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        [
          "relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
          isActive ? "bg-primaryContainer text-onPrimaryContainer" : "text-paper/64 hover:bg-primaryContainer/55 hover:text-paper",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function MobileNavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        [
          "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-bold",
          isActive ? "bg-primaryContainer text-onPrimaryContainer" : "text-paper/56",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-full truncate">{item.label}</span>
    </NavLink>
  );
}
