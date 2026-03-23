import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Workspace from './pages/Workspace';
import History from './pages/History';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page (Auth) at root */}
        <Route path='/' element={<Auth />} />
        
        {/* Dashboard/Workspace Layout under /dashboard */}
        <Route path='/dashboard' element={<Layout />}>
          <Route index element={<Workspace />} />
          <Route path='history' element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
