import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { loginWithMicrosoft, loginWithGoogle } = useAuth();

  // Determine the provider based on the current path
  const isGoogleCallback = location.pathname.includes('/auth/google/callback');
  const providerName = isGoogleCallback ? 'Google' : 'Microsoft';

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login', { state: { error: 'Authentication failed. Please try again.' } });
        return;
      }

      if (!code) {
        navigate('/login', { state: { error: 'No authorization code received.' } });
        return;
      }

      try {
        // Use the appropriate login method based on the provider
        if (isGoogleCallback) {
          await loginWithGoogle(code);
        } else {
          await loginWithMicrosoft(code);
        }
        navigate('/dashboard');
      } catch (error) {
        console.error(`${providerName} login failed:`, error);
        navigate('/login', { state: { error: error.message || 'Login failed. Please try again.' } });
      }
    };

    handleCallback();
  }, [searchParams, loginWithMicrosoft, loginWithGoogle, navigate, location, isGoogleCallback, providerName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Loader2 className="w-8 h-8 text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authenticating...</h2>
          <p className="text-gray-600 mb-8">
            Please wait while we securely sign you in with {providerName}.
          </p>
          
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-indigo-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-indigo-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-indigo-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
