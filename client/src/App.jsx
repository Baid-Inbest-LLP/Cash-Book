import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './lib/session';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import HomePage from './pages/home/HomePage';
import SettingsPage from './pages/settings/SettingsPage';
import CompanyListPage from './pages/control-center/CompanyListPage';
import EntriesPage from './pages/entries/EntriesPage';
import ExcludedEntriesPage from './pages/entries/ExcludedEntriesPage';
import MonthwiseReportPage from './pages/reports/MonthwiseReportPage';
import ExpenseHeadReportPage from './pages/reports/ExpenseHeadReportPage';
import CompanyReportPage from './pages/reports/CompanyReportPage';

function PublicOnly({ children }) {
  if (isAuthenticated()) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnly>
              <ForgotPasswordPage />
            </PublicOnly>
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="control-center" element={<CompanyListPage />} />
          <Route path="entries" element={<EntriesPage />} />
          <Route path="excluded-entries" element={<ExcludedEntriesPage />} />
          <Route path="reports/monthwise" element={<MonthwiseReportPage />} />
          <Route path="reports/expense-heads" element={<ExpenseHeadReportPage />} />
          <Route path="reports/companies" element={<CompanyReportPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Old path kept as a redirect for existing bookmarks. */}
          <Route path="companies" element={<Navigate to="/control-center" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
