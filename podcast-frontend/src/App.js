import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Pages/Login/Login';
import Dashboard from './Pages/Dashboard/Dashboard';
import PodcastGeneratorGuest from './Components/PodcastGeneratorGuest';
import PodcastGenerator from './Components/PodcastGenerator';
import './App.css';

function App() {
  return (
    <div className="iridescence-container">
      <div className="iridescence"></div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Router>
          <Routes>
            <Route path="/" element={<PodcastGeneratorGuest />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/all-podcasts" element={<PodcastGenerator />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
