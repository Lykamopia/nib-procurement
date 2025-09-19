
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { getUserByToken, login as authLoginHelper, getAllUsers } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  allUsers: User[];
  switchUser: (userId: string) => void;
  login: (token: string, user: User, role: UserRole) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);


  useEffect(() => {
    const initializeAuth = async () => {
      try {
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
        
        // Fetch all users for the role switcher
        const users = await getAllUsers();
        setAllUsers(users);

      } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem('authToken');
      } finally {
          setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const login = (newToken: string, loggedInUser: User, loggedInRole: UserRole) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    setRole(loggedInRole);
  };
  
  const switchUser = async (userId: string) => {
    const targetUser = allUsers.find(u => u.id === userId);
    if (targetUser && targetUser.password) {
        const loginResult = await authLoginHelper(targetUser.email, targetUser.password);
        if (loginResult) {
            login(loginResult.token, loginResult.user, loginResult.role);
            // Force a reload to ensure all state is correctly reset for the new user
            window.location.href = '/';
        }
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, role, allUsers, switchUser, login, logout, loading }}>
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
