
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { User, UserRole } from '@/lib/types';
import { getUserByToken } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      getUserByToken(storedToken).then(userData => {
        if(userData) {
          setToken(storedToken);
          setUser(userData.user);
          setRole(userData.role);
        } else {
          localStorage.removeItem('authToken');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInRole);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      login,
      logout,
      loading
  }), [user, token, role, loading, allUsers]);


  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
