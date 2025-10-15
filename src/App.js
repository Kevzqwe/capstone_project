import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login/Login';
import StudentDashboard from './Student_Dashboard/Student_Dashboard';
import AdminDashboard from './Admin_Dashboard/Admin_Dashboard'; // Add this import
import Pay_Success from './Pay_Success/Pay_Success';
import Pay_Cancelled from './Pay_Cancelled/Pay_Cancelled';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} /> {/* Add this route */}
        <Route path="/Pay_Success" element={<Pay_Success />} />
        <Route path="/Pay_Cancelled" element={<Pay_Cancelled />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;