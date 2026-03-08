import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register } from '../api';
import { useToast } from '../context/ToastContext';
import FormField from '../components/FormField';

export default function Register() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameError = username.trim().length < 2 ? 'Минимум 2 символа' : '';
  const emailError = !emailRegex.test(email.trim()) ? 'Введите корректный email' : '';
  const passwordError = password.length < 6 ? 'Минимум 6 символов' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    if (usernameError || emailError || passwordError) return;
    setError('');
    setLoading(true);
    try {
      const data = await register(username, password, email);
      authLogin(data);
      toast.success('Регистрация прошла успешно');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
      toast.error(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Регистрация</h1>
        <form onSubmit={handleSubmit}>
          <FormField label="Логин" error={touched.username && usernameError ? usernameError : ''}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
              className={touched.username && usernameError ? 'input-invalid' : ''}
              required
              minLength={2}
              autoComplete="username"
            />
          </FormField>
          <FormField label="Email" error={touched.email && emailError ? emailError : ''}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              className={touched.email && emailError ? 'input-invalid' : ''}
              required
              autoComplete="email"
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
              minLength={6}
              autoComplete="new-password"
            />
          </FormField>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading || Boolean(usernameError || emailError || passwordError)}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', color: '#a1a1aa' }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
