import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ServiceReportForm from './components/ServiceReportForm';
import ReportList from './components/ReportList';
import HospitalManager from './components/HospitalManager';
import BusinessPlan from './components/BusinessPlan';
import { syncAllData } from './supabase';
import './index.css';

function App() {
  useEffect(() => {
    syncAllData();
  }, []);

  return (
    <Router>
      <div className="container animate-fade-in">
        <header className="nav-header print-hide">
          <h1>Service Report App</h1>
          <nav className="nav-links">
            <Link to="/">New Report</Link>
            <Link to="/reports">View Reports</Link>
            <Link to="/hospitals">Manage Hospitals</Link>
            <Link to="/business">업무 계획</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<ServiceReportForm />} />
          <Route path="/reports" element={<ReportList />} />
          <Route path="/reports/:id" element={<ServiceReportForm />} />
          <Route path="/hospitals" element={<HospitalManager />} />
          <Route path="/business" element={<BusinessPlan />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
