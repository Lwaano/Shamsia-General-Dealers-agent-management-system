import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Float from './pages/Float';
import Reconciliation from './pages/Reconciliation';
import Transactions from './pages/Transactions';
import Inventory from './pages/Inventory';
import Agents from './pages/Agents';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="float" element={<Float />} />
              <Route path="reconciliation" element={<Reconciliation />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="inventory" element={<Inventory />} />
              <Route
                path="agents"
                element={
                  <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                    <Agents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-log"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
