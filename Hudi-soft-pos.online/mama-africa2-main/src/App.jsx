import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LicenseGate from './components/Layout/LicenseGate';

// Pages
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import POS from './pages/pos';
import Kitchen from './pages/kitchen';
import Orders from './pages/orders';
import Inventory from './pages/inventory';
import CustomerLedger from './pages/customer-ledger';
import Finance from './pages/finance';
import Settings from './pages/settings';
import Users from './pages/users';
import Tables from './pages/tables';
import Purchase from './pages/purchase';
import Reports from './pages/reports';
import CustomerDisplay from './pages/customer-display';
import CashierHandoverReport from './pages/cashier-handover-report';
import ActivationPage from './pages/activation';
import AdminLicenseDashboard from './pages/admin-license';
import Sales from './pages/sales';
import Employees from './pages/employees';
import QRMenu from './pages/qr-menu';
import WaiterDashboard from './pages/waiter-dashboard';
import QRManagement from './pages/qr-management';
import Attendance from './pages/attendance';
import EmployeeAttendance from './pages/employee-attendance';

// Hotel Pages
import HotelRoute from './components/HotelRoute';
import HotelDashboard from './pages/hotel-dashboard';
import HotelRooms from './pages/hotel-rooms';
import HotelReservations from './pages/hotel-reservations';
import HotelFrontDesk from './pages/hotel-frontdesk';
import HotelHousekeeping from './pages/hotel-housekeeping';

import PwaInstallPrompt from './components/PwaInstallPrompt';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="App h-full w-full">
            <Toaster position="top-right" />
            <PwaInstallPrompt />
            <Routes>

              {/* ──────────────────────────────────────────────────────────
                  FULLY PUBLIC ROUTES — no auth, no license key, ever.
                  These are completely outside LicenseGate so customers
                  scanning a QR code NEVER see the license key screen.
              ────────────────────────────────────────────────────────── */}
              <Route path="/menu"          element={<QRMenu />} />
              <Route path="/order"         element={<QRMenu />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/customer-view" element={<CustomerDisplay />} />
              <Route path="/activate"      element={<ActivationPage />} />
              <Route path="/attendance/:id" element={<EmployeeAttendance />} />

              {/* ──────────────────────────────────────────────────────────
                  ALL OTHER ROUTES — guarded by LicenseGate + ProtectedRoute.
                  Staff and admins must activate the system before accessing
                  any POS, admin, or management pages.
              ────────────────────────────────────────────────────────── */}
              <Route path="/*" element={
                <LicenseGate>
                  <Routes>

                    {/* POS is full-screen, outside the main Layout */}
                    <Route path="pos" element={
                      <ProtectedRoute requiredRoles={['admin', 'manager', 'cashier', 'waiter']}>
                        <POS />
                      </ProtectedRoute>
                    } />

                    {/* Protected routes inside the sidebar Layout */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Navigate to="/pos" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />

                      <Route path="kitchen" element={
                        <ProtectedRoute requiredRoles={['admin', 'chef']}>
                          <Kitchen />
                        </ProtectedRoute>
                      } />

                      <Route path="orders" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'cashier', 'waiter']}>
                          <Orders />
                        </ProtectedRoute>
                      } />

                      <Route path="tables" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'waiter']}>
                          <Tables />
                        </ProtectedRoute>
                      } />

                      <Route path="waiter" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'waiter']}>
                          <WaiterDashboard />
                        </ProtectedRoute>
                      } />

                      <Route path="qr-management" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <QRManagement />
                        </ProtectedRoute>
                      } />

                      <Route path="inventory" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Inventory />
                        </ProtectedRoute>
                      } />

                      <Route path="customers" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'cashier']}>
                          <CustomerLedger />
                        </ProtectedRoute>
                      } />

                      <Route path="customers/ledger" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'cashier']}>
                          <CustomerLedger />
                        </ProtectedRoute>
                      } />

                      <Route path="finance" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Finance />
                        </ProtectedRoute>
                      } />

                      <Route path="purchase" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Purchase />
                        </ProtectedRoute>
                      } />

                      <Route path="reports" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Reports />
                        </ProtectedRoute>
                      } />

                      <Route path="sales" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Sales />
                        </ProtectedRoute>
                      } />

                      <Route path="employees" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Employees />
                        </ProtectedRoute>
                      } />

                      <Route path="attendance" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Attendance />
                        </ProtectedRoute>
                      } />

                      <Route path="reports/cashier-handover" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <CashierHandoverReport />
                        </ProtectedRoute>
                      } />

                      <Route path="settings" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Settings />
                        </ProtectedRoute>
                      } />

                      <Route path="users" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <Users />
                        </ProtectedRoute>
                      } />

                       <Route path="admin/licensing" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <AdminLicenseDashboard />
                        </ProtectedRoute>
                      } />

                      {/* ── Hotel Management Routes (inside Layout) ── */}
                      <Route path="hotel/dashboard" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <HotelDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="hotel/rooms" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <HotelRooms />
                        </ProtectedRoute>
                      } />
                      <Route path="hotel/reservations" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'cashier']}>
                          <HotelReservations />
                        </ProtectedRoute>
                      } />
                      <Route path="hotel/frontdesk" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'cashier']}>
                          <HotelFrontDesk />
                        </ProtectedRoute>
                      } />
                      <Route path="hotel/housekeeping" element={
                        <ProtectedRoute requiredRoles={['admin', 'manager']}>
                          <HotelHousekeeping />
                        </ProtectedRoute>
                      } />
                    </Route>

                    <Route path="*" element={<Navigate to="/pos" replace />} />

                  </Routes>
                </LicenseGate>
              } />

            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
