import React, { useState } from 'react';
import '../css/startup.css';
import logo from '../assets/images.png';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Detect mobile view for logo placement
  const isMobile = window.matchMedia('(max-width: 767.98px)').matches;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(`Reset password link sent to ${email}`);
    setEmail('');
  };

  return (
    <div className="StartPage">
      {/* Left side for desktop/tablet */}
      {!isMobile && (
        <div className="Left">
          <img src={logo} alt="Logo" className="Logo mb-3" />
          <h2 className="text-center">Forgot your password?</h2>
        </div>
      )}
      {/* Form side */}
      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          {/* Logo for mobile only */}
          {isMobile && (
            <img src={logo} alt="Logo" className="Logo mb-3 d-block mx-auto" />
          )}
          <h3 className="text-center">Forgot Password</h3>
          <form onSubmit={handleSubmit} className="LoginForm">
            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-envelope IconOutside"></i>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="InputField form-control ps-5"
                required
              />
            </div>
            <button type="submit" className="LoginButton btn w-100">
              Send Reset Link
            </button>
          </form>
          {message && <p className="text-success mt-3 text-center">{message}</p>}
          <div className="SignUpLink text-center mt-3">
            <Link to="/">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;