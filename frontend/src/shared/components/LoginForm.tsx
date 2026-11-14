import React, { useState } from 'react';

interface LoginFormProps {
  readonly onSubmit: (email: string, password: string) => Promise<string | null>;
}

/** Interim sign-in form (HTTP Basic) until SSO ticket login (NT-01) lands. */
export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const message = await onSubmit(email.trim(), password);
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <form className="sp-login" onSubmit={(event) => void handleSubmit(event)}>
      <h2 className="sp-heading">Đăng nhập để xem hồ sơ năng lực</h2>
      <label className="sp-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="sp-field">
        <span>Mật khẩu</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && (
        <p className="sp-status sp-status-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="sp-btn" disabled={busy}>
        {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
};
