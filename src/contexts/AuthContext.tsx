mport { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/api';
import { getMe } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch((err: unknown) => {
  	  const e = err as { response?: { status?: number } };
  	  if (e?.response?.status === 401) {
    		localStorage.removeItem('token');
    		setToken(null);
 	  }
	})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const setAuth = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
