

import React, { useState } from 'react';
import { Share2, Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/api';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const passwordMin = 6;
  const passwordIsStrong = formData.password.length >= passwordMin;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => {
      const next = { ...prevData, [name]: value };
      if (name === 'confirmPassword' || name === 'password') {
        setPasswordMatch(next.confirmPassword === next.password);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!passwordMatch) {
      setError('Passwords do not match. Please make sure both passwords are identical.');
      setLoading(false);
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address (e.g., user@example.com).');
      setLoading(false);
      return;
    }
    if (!passwordIsStrong) {
      setError(`Password must be at least ${passwordMin} characters long for security.`);
      setLoading(false);
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
      });
      
      setSuccess('Account created successfully! Redirecting you to login page...');
      setFormData({ email: '', password: '', confirmPassword: '' });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Registration failed. Please check your internet connection and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    loading ||
    !isValidEmail(formData.email) ||
    !passwordIsStrong ||
    !passwordMatch;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Share2 className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">
            FileShare
          </span>
        </div>

        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Register
        </h1>

        {error && (
          <div
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            {success}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            {formData.email && !isValidEmail(formData.email) && (
              <p className="mt-1 text-xs text-red-600">Enter a valid email address</p>
            )}
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
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Create a password"
                required
                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className={`text-xs ${passwordIsStrong ? 'text-green-600' : 'text-gray-500'}`}>
                Minimum {passwordMin} characters
              </p>
              <div className="h-1 w-24 rounded bg-gray-200">
                <div
                  className={`h-1 rounded ${passwordIsStrong ? 'bg-green-600' : 'bg-blue-400'}`}
                  style={{ width: `${Math.min(100, (formData.password.length / passwordMin) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Re-enter password"
                required
                className={`w-full rounded-md bg-white py-3 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:ring-2 ${
                  passwordMatch
                    ? 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                    : 'border border-red-500 focus:border-red-500 focus:ring-red-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!passwordMatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {/* Sign in */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?
          <Link to="/login" className="ml-1 font-medium text-blue-600 hover:text-blue-700">
            Login
          </Link>
        </p>
              <div className="mt-6 text-center">
        <Link to="/" className="inline-block text-blue-600 hover:text-blue-800 font-medium underline">&larr; Back to Home</Link>
      </div>



    </div>
  </div>
  );
};

export default Register;