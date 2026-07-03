import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Overview from "./routes/Overview.jsx";
import Projects from "./routes/Projects.jsx";
import ProjectDetail from "./routes/ProjectDetail.jsx";
import SystemMap from "./routes/SystemMap.jsx";
import Documents from "./routes/Documents.jsx";
import DocsReader from "./routes/DocsReader.jsx";
import AgentsTelemetry from "./routes/AgentsTelemetry.jsx";
import Workspace from "./routes/Workspace.jsx";
import HskgLaunch from "./routes/HskgLaunch.jsx";
import JourneyLog from "./routes/JourneyLog.jsx";
import Capital from "./routes/Capital.jsx";
import Inbox from "./routes/Inbox.jsx";
import CommandCenter from "./routes/CommandCenter.jsx";
import Signals from "./routes/Signals.jsx";
import Connectors from "./routes/Connectors.jsx";
import Content from "./routes/Content.jsx";
import Vault from "./routes/Vault.jsx";
import Playground from "./routes/Playground.jsx";

const CalendarMatrix = lazy(() => import("./routes/CalendarMatrix.jsx"));

export default function App() {
  return (
    <Shell>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/command" element={<CommandCenter />} />
          <Route path="/playground" element={<Playground />} />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={<div className="glass rounded-[var(--hz-radius-md)] p-6 text-sm font-bold text-paper/64">Loading calendar surface...</div>}>
                <CalendarMatrix />
              </Suspense>
            }
          />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/journey" element={<JourneyLog />} />
          <Route path="/capital" element={<Capital />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/content" element={<Content />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/agents" element={<AgentsTelemetry />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/connectors" element={<Connectors />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/map" element={<SystemMap />} />
          <Route path="/documents" element={<DocsReader />} />
          <Route path="/documents/legacy" element={<Documents />} />
          <Route path="/hskg" element={<HskgLaunch />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Shell>
  );
}
