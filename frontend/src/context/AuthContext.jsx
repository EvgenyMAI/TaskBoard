import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const data = localStorage.getItem('user');
    if (token && data) {
      try {
        setUser(JSON.parse(data));
      } catch (_) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (authResponse) => {
    const nextUser = {
      userId: authResponse.userId,
      username: authResponse.username,
      roles: authResponse.roles,
    };
    localStorage.setItem('token', authResponse.accessToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const updateUserIdentity = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserIdentity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
