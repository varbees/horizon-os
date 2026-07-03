import {
  LayoutDashboard,
  Terminal,
  CalendarDays,
  GitBranch,
  Gauge,
  BookOpen,
  Wallet,
  Inbox,
  PenSquare,
  Rss,
  Cable,
  FolderGit2,
  FileText,
  Wand2,
  Bot,
  FolderInput,
} from "lucide-react";

// Single source of truth for navigation. The sidebar, the mobile bar, and the
// ⌘K command palette all read this — grouped so 14 destinations feel organized,
// not like a wall of tabs.

export const NAV_GROUPS = [
  {
    label: "Command",
    items: [
      { to: "/", label: "Command", detail: "Daily anchors", icon: LayoutDashboard, keywords: "home overview control tower" },
      { to: "/command", label: "Center", detail: "Action queue", icon: Terminal, keywords: "deploy actions agents queue" },
      { to: "/calendar", label: "Calendar", detail: "Foundry week", icon: CalendarDays, keywords: "schedule week blocks" },
      { to: "/map", label: "Map", detail: "System graph", icon: GitBranch, keywords: "graph nodes flow architecture" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { to: "/projects", label: "Hub", detail: "Repo lanes", icon: Gauge, keywords: "projects portfolio repos money" },
      { to: "/journey", label: "Journey", detail: "Trek ledger", icon: BookOpen, keywords: "log elevation places" },
      { to: "/capital", label: "Capital", detail: "Runway math", icon: Wallet, keywords: "money finance runway burn ledger" },
    ],
  },
  {
    label: "Engine",
    items: [
      { to: "/inbox", label: "Inbox", detail: "Resource intake", icon: Inbox, keywords: "capture links resources posts" },
      { to: "/content", label: "Content", detail: "Wealth engine", icon: PenSquare, keywords: "briefs publish social" },
      { to: "/signals", label: "Signals", detail: "News feed", icon: Rss, keywords: "rss news feed sources" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/agents", label: "Agents", detail: "Runs + telemetry", icon: Bot, keywords: "agent runs telemetry deploy track evaluate cost usage" },
      { to: "/workspace", label: "Workspace", detail: "Load any repo", icon: FolderInput, keywords: "workspace root load repo folder sweep open source byo" },
      { to: "/connectors", label: "Connectors", detail: "Agents + MCP", icon: Cable, keywords: "mcp tools providers keys" },
      { to: "/vault", label: "Vault", detail: "Obsidian + wiki", icon: FolderGit2, keywords: "obsidian memory wiki notes" },
      { to: "/documents", label: "Docs", detail: "Runbooks", icon: FileText, keywords: "documents markdown reader runbooks" },
      { to: "/playground", label: "Playground", detail: "Ideation", icon: Wand2, keywords: "prompt sandbox experiment" },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
