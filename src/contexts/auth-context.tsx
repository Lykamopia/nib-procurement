

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
        // This fetches non-vendor users for the user management dropdown.
        // The main login fetches the specific user's full data.
        const response = await fetch('/api/users');
        if (response.ok) {
            const usersData = await response.json();
            setAllUsers(usersData);
            return usersData;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch all users", error);
        return [];
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    await fetchAllUsers();
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
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetUser.email, password: 'password123' }),
          });
          
          if(response.ok) {
              const result = await response.json();
              login(result.token, result.user, result.role);
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
