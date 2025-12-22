import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const GoogleSignInButton = () => {
  const { getGoogleAuthUrl } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="inline-flex items-center justify-center w-10 h-10 p-0 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors duration-150 border-0 shadow-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
      ) : (
        <FcGoogle className="w-6 h-6" />
      )}
    </motion.button>
  );
};

export default GoogleSignInButton;
