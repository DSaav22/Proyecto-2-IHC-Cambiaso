import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, ProtectedRoute } from "./auth/routes";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RecoverPage from "./pages/RecoverPage";
import MyPlansPage from "./pages/MyPlansPage";
import ActivityHistoryPage from "./pages/ActivityHistoryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/recover" element={<RecoverPage />} />
      <Route path="/recover/confirm" element={<RecoverPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/mis-planes" element={<MyPlansPage />} />
        <Route path="/historial" element={<ActivityHistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
