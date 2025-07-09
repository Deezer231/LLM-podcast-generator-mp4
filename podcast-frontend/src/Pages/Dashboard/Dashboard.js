import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Components/context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/'); // Redirect to main page after logout
  };

  return (
    <div className="dashboard" style={{ position: 'relative' }}>
      {user && (
        <button
          onClick={handleLogout}
          style={{ position: 'absolute', top: 20, right: 20, padding: '8px 16px', zIndex: 2 }}
        >
          Logout
        </button>
      )}
      <h1>Welcome to Your Dashboard</h1>
      {user && (
        <div className="user-info">
          <p><strong>Logged in as:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      )}
      <ul>
        <li>
          <Link to="/all-podcasts">All PODCASTS</Link>
        </li>
      </ul>
    </div>
  );
};

export default Dashboard;
