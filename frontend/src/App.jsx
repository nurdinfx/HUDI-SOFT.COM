import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import LandingPage from './pages/LandingPage';
import OrderFlow from './pages/OrderFlow';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import RequestDemo from './pages/RequestDemo';
import CustomerDashboard from './pages/CustomerDashboard';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/order" element={<OrderFlow />} />
            <Route path="/request-demo" element={<RequestDemo />} />
            <Route path="/admin/login" element={<AuthPage />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<CustomerDashboard />} />
          </Routes>
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
