// src/context/AuthContext.tsx
// Gère l'état de connexion global : utilisateur courant, login, register, logout
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

type AuthContextType = {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshTenant: () => Promise<void>;
};

type RegisterData = {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  currency?: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au chargement de l'app, vérifie s'il y a une session sauvegardée
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');
    const token = localStorage.getItem('accessToken');
    if (savedUser && savedTenant && token) {
      setUser(JSON.parse(savedUser));
      setTenant(JSON.parse(savedTenant));
    }
    setIsLoading(false);
  }, []);

  function saveSession(data: {
    user: User;
    tenant: Tenant;
    accessToken: string;
    refreshToken: string;
  }) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    setUser(data.user);
    setTenant(data.tenant);
  }

  async function login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    saveSession(response.data.data);
  }

  async function register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    saveSession(response.data.data);
  }

  // Recharge les infos de l'entreprise depuis l'API et met a jour le state
  // + le localStorage. A appeler apres un changement de devise, de nom, etc.,
  // pour que toute l'app reflete la nouvelle valeur sans reconnexion.
  async function refreshTenant() {
    const response = await api.get('/tenants/me');
    const freshTenant = response.data.data;
    localStorage.setItem('tenant', JSON.stringify(freshTenant));
    setTenant(freshTenant);
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider
      value={{ user, tenant, isLoading, login, register, logout, refreshTenant }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  }
  return context;
}