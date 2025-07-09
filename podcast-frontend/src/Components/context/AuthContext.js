import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

// 1. Create the context
const AuthContext = createContext();

// 2. Create the custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 3. Create the provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the logged-in user's data
  const getUser = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/user', {
        withCredentials: true, // Include session cookies
      });
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error fetching user:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getUser(); // Fetch user data on component mount
  }, [getUser]);

  const register = async (username, password, email) => {
    try {
      const res = await axios.post(
        'http://localhost:5000/register',
        { username, password, email },
        { withCredentials: true }
      );
      // Set user from response or fallback
      setUser(res.data.user || { username, email });
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Error during registration:', err);
      return false;
    }
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post(
        'http://localhost:5000/login',
        { username, password },
        { withCredentials: true }
      );
      // Set user from response or fallback
      setUser(res.data.user || { username });
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Error during login:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading,
      login, 
      register, 
      logout, 
      getUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4. Export the provider and context
export { AuthContext, AuthProvider };