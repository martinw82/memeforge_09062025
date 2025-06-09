import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';
import { X, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const { signIn, signUp, isLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      if (mode === 'signup') {
        // Track signup attempt
        await trackEvent('user_signup_attempt', {
          auth_method: 'email_password',
        });

        const { error } = await signUp(email, password);
        if (error) {
          setError(error);
          await trackEvent('user_signup_failure', {
            auth_method: 'email_password',
            error_message: error,
          });
        } else {
          setSuccess('Registration successful! Please check your email for verification.');
          await trackEvent('user_signed_up', {
            auth_method: 'email_password',
          });
          resetForm();
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else {
        // Track signin attempt
        await trackEvent('user_signin_attempt', {
          auth_method: 'email_password',
        });

        const { error } = await signIn(email, password);
        if (error) {
          setError(error);
          await trackEvent('user_signin_failure', {
            auth_method: 'email_password',
            error_message: error,
          });
        } else {
          setSuccess('Signed in successfully!');
          // Note: user_logged_in event is tracked in Navbar component
          resetForm();
          setTimeout(() => {
            handleClose();
          }, 1000);
        }
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      
      await trackEvent(mode === 'signup' ? 'user_signup_failure' : 'user_signin_failure', {
        auth_method: 'email_password',
        error_message: errorMessage,
      });
    }
  };

  const handleModeSwitch = async (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    resetForm();
    
    await trackEvent('auth_mode_switched', {
      from_mode: mode,
      to_mode: newMode,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-md">
                <User className="h-5 w-5 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => handleModeSwitch(mode === 'signin' ? 'signup' : 'signin')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;