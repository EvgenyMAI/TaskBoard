import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api';
import { useToast } from '../context/ToastContext';
import FormField from '../components/FormField';

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const usernameError = username.trim().length < 2 ? 'Минимум 2 символа' : '';
  const passwordError = password.length < 6 ? 'Минимум 6 символов' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (usernameError || passwordError) return;
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      authLogin(data);
      toast.success(`Добро пожаловать, ${data.username}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Ошибка входа');
      toast.error(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Вход</h1>
        <form onSubmit={handleSubmit}>
          <FormField label="Логин" error={touched.username && usernameError ? usernameError : ''}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
              className={touched.username && usernameError ? 'input-invalid' : ''}
              required
              autoComplete="username"
            />
          </FormField>
          <FormField label="Пароль" error={touched.password && passwordError ? passwordError : ''}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              className={touched.password && passwordError ? 'input-invalid' : ''}
              required
              autoComplete="current-password"
            />
          </FormField>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading || Boolean(usernameError || passwordError)}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', color: '#a1a1aa' }}>
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </div>
    </div>
  );
}
