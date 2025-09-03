import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';


const GoogleSignInButton = () => {
  const handleGoogleLogin = () => {
    // Handle Google login logic
    console.log('Google login clicked');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleGoogleLogin}
      className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <FcGoogle className="w-5 h-5" />
      <span>Sign in with Google</span>
    </motion.button>
  );
};

export default GoogleSignInButton;