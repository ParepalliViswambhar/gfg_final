import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Auth from './pages/Auth';
import Workspace from './pages/Workspace';
import History from './pages/History';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page (Auth) at root */}
        <Route path='/' element={<Auth />} />
        
        {/* Dashboard/Workspace Layout under /dashboard - Protected */}
        <Route 
          path='/dashboard' 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Workspace />} />
          <Route path='history' element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
