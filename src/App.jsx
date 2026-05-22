import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Shell from "./components/Shell.jsx";
import Overview from "./routes/Overview.jsx";
import Projects from "./routes/Projects.jsx";
import SystemMap from "./routes/SystemMap.jsx";
import Documents from "./routes/Documents.jsx";
import HskgLaunch from "./routes/HskgLaunch.jsx";

const CalendarMatrix = lazy(() => import("./routes/CalendarMatrix.jsx"));

export default function App() {
  return (
    <Shell>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={<div className="glass rounded-[var(--hz-radius-md)] p-6 text-sm font-bold text-paper/64">Loading calendar surface...</div>}>
                <CalendarMatrix />
              </Suspense>
            }
          />
          <Route path="/projects" element={<Projects />} />
          <Route path="/map" element={<SystemMap />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/hskg" element={<HskgLaunch />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Shell>
  );
}
