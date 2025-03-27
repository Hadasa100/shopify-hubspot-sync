// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // אימות פשוט - מומלץ להחליף ב־backend בעתיד
    const validUser = process.env.REACT_APP_USERNAME;
    const validPass = process.env.REACT_APP_PASSWORD;

    if (username === validUser && password === validPass) {
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/');
    } else {
      alert('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-[#0e0b0f] via-[#2c0a3a] to-[#000000] text-white">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-xl w-full max-w-sm">
        <h2 className="text-3xl font-light mb-6 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full p-2 rounded bg-white/10 text-white placeholder-white/50"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 rounded bg-white/10 text-white placeholder-white/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="glow-btn w-full">Login</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
