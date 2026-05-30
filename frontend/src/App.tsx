import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { Assets } from "./pages/Assets";
import { Findings } from "./pages/Findings";
import { Alerts } from "./pages/Alerts";
import { HostDetail } from "./pages/HostDetail";

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="assets" element={<Assets />} />
          <Route path="findings" element={<Findings />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="host/:host" element={<HostDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
