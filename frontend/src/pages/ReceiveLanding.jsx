import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { getRoomByOtp } from '../api/api';

const ReceiveLanding = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    setError('');
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'Enter') handleSubmit();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-character code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await getRoomByOtp(code);
      navigate(`/receiver/${res.data.roomId}?password=${code}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please check and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Receive a File</h1>
          <p className="mt-2 text-gray-600">Enter the 6-character share code given by the sender.</p>
        </div>

        {/* OTP boxes */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 text-center mb-5">Share Code</label>
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {otp.map((char, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                maxLength={1}
                value={char}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold uppercase rounded-lg border-2 border-gray-300 bg-gray-50 text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 caret-transparent"
                autoFocus={i === 0}
                autoComplete="off"
                spellCheck={false}
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || otp.join('').length < 6}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Looking up...' : 'Open Share →'}
          </button>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            Have a link? Just open it directly in your browser — no code needed.
          </p>
        </div>

        {/* Back to send */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Want to send instead?{' '}
          <a href="/" className="font-medium text-blue-600 hover:underline">Go to Sender</a>
        </p>
      </main>
    </div>
  );
};

export default ReceiveLanding;
