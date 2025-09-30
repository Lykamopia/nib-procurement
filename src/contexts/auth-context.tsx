
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
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
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllUsers = useCallback(async () => {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const usersData = await response.json();
            setAllUsers(usersData);
            return usersData; // Return data for immediate use
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch all users", error);
        return [];
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    const users = await fetchAllUsers();
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
        const userData = await getUserByToken(storedToken);
        if(userData) {
            setToken(storedToken);
            setUser(userData.user);
            setRole(userData.role);
        } else {
            localStorage.removeItem('authToken');
        }
    }
    setLoading(false);
    return users;
  }, [fetchAllUsers]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
  
  const switchUser = async (userId: string) => {
      const targetUser = allUsers.find(u => u.id === userId);
      if (targetUser) {
           // Simulate a login for the switched user to get a new token/session
           // NOTE: This uses a mock password and would need a secure implementation in a real app
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: targetUser.email, password: 'password123' }), // Assumes a default password for demo
          });
          
          if(response.ok) {
              const result = await response.json();
              login(result.token, result.user, result.role);
              // Force a reload to ensure all context and page states are fresh for the new user
              window.location.href = '/';
          } else {
              console.error("Failed to switch user.")
          }
      }
  };

  const authContextValue = useMemo(() => ({
      user,
      token,
      role,
      allUsers,
      login,
      logout,
      loading,
      switchUser
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
