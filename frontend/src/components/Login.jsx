

import React, { useState } from 'react';
import { Share2, Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/api';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === 'rememberMe') {
      setRememberMe(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleShowPassword = () => setShowPassword((s) => !s);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login({ email: form.email, password: form.password });

  if (rememberMe) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('email', form.email);
      } else {
        sessionStorage.setItem('token', res.data.token);
        sessionStorage.setItem('email', form.email);
      }

  // Notify app of login
  window.dispatchEvent(new Event('userLogin'))

      navigate('/');
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed. Please check your internet connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    loading || !form.email.trim() || !form.password.trim();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Share2 className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">FileShare</span>
        </div>

        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Login</h1>

        {error && (
          <div
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Register */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?
          <Link to="/register" className="ml-1 font-medium text-blue-600 hover:text-blue-700">
            Register
          </Link>
        </p>
              <div className="mt-6 text-center">
        <Link to="/" className="inline-block text-blue-600 hover:text-blue-800 font-medium underline">&larr; Back to Home</Link>
      </div>

      </div> 
      {/* Back to Home */}

    </div>
  );
};

export default Login;