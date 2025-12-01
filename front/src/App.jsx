import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import Historial from './pages/Historial';
import ShareView from './pages/ShareView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/share/:token" element={<ShareView />} />
      </Routes>
    </Router>
  );
}

export default App;
