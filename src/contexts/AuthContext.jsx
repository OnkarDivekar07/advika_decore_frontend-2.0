import React, { createContext, useState } from 'react';
import { getToken, saveToken, clearToken } from '../utils/authUtils';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getToken());

  const login = (newToken) => {
    setToken(newToken);
    saveToken(newToken);
  };

  const logout = () => {
    setToken(null);
    clearToken();
  };

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
