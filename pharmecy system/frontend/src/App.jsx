import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Branches from './pages/Branches';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Finance from './pages/Finance';
import Shareholders from './pages/Shareholders';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Subscription from './pages/Subscription';
import Staff from './pages/Staff';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import useAuthStore from './store/authStore';


const ProtectedRoute = ({ children, roles }) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/landing" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/dashboard" element={<ProtectedRoute roles={['Super Admin']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="branches" element={<ProtectedRoute roles={['Super Admin', 'Owner']}><Branches /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute roles={['Super Admin', 'Owner', 'Branch Manager', 'Pharmacist']}><Inventory /></ProtectedRoute>} />
          <Route path="pos" element={<ProtectedRoute roles={['Super Admin', 'Owner', 'Branch Manager', 'Pharmacist', 'Cashier']}><POS /></ProtectedRoute>} />
          <Route path="finance" element={<ProtectedRoute roles={['Super Admin', 'Owner']}><Finance /></ProtectedRoute>} />
          <Route path="shareholders" element={<ProtectedRoute roles={['Super Admin', 'Owner']}><Shareholders /></ProtectedRoute>} />
          <Route path="staff" element={<ProtectedRoute roles={['Super Admin', 'Owner', 'Branch Manager']}><Staff /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute roles={['Super Admin', 'Owner', 'Branch Manager']}><Suppliers /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute roles={['Super Admin', 'Owner', 'Branch Manager']}><Expenses /></ProtectedRoute>} />
          <Route path="subscription" element={<ProtectedRoute roles={['Super Admin', 'Owner']}><Subscription /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute roles={['Super Admin', 'Owner']}><Settings /></ProtectedRoute>} />
        </Route>


        <Route path="*" element={<Navigate to="/landing" />} />
      </Routes>
    </Router>
  );
}

export default App;
