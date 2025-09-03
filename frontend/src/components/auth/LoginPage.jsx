import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';


import { LogIn, Sparkles, Database, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import GoogleSignInButton from './GoogleSignInButton';

const LoginPage = () => {
  const { getMicrosoftAuthUrl, loading } = useAuth();
  const [authUrl, setAuthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const fetchAuthUrl = async () => {
      try {
        const url = await getMicrosoftAuthUrl();
        setAuthUrl(url);
      } catch (error) {
        console.error('Failed to get auth URL:', error);
      }
    };
    fetchAuthUrl();
  }, [getMicrosoftAuthUrl]);

  const handleMicrosoftLogin = () => {
    setIsLoading(true);
    window.location.href = authUrl;
  };

  const handleAuthSuccess = () => {
    // The auth context will handle redirecting to the dashboard
    // This is just for any additional success handling if needed
    console.log('Authentication successful');
  };

  const toggleForm = () => {
    setShowRegister(!showRegister);
  };

  const features = [
    {
      icon: Database,
      title: "Smart Data Processing",
      description: "Upload and process CSV, Excel files with intelligent data cleansing capabilities"
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Generate insights with custom formulas, filters, and statistical analysis"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is protected with Microsoft authentication and enterprise-grade security"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 p-12 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <motion.div 
            className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-white"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.1, 0.2],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center mb-8">
              <Sparkles className="w-8 h-8 mr-3" />
              <h1 className="text-3xl font-bold">Data Cleansing Pro</h1>
            </div>
            
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Transform Your Data with 
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                Intelligent Processing
              </span>
            </h2>
            
            <p className="text-lg text-indigo-100 mb-12 leading-relaxed">
              Streamline your data workflow with our powerful cleansing tools. 
              Create projects, upload files, and apply sophisticated transformations 
              with an intuitive interface designed for professionals.
            </p>
          </motion.div>

          <div className="space-y-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="flex items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Authentication */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
              >
                <Database className="w-8 h-8 text-white" />
              </motion.div>
            </div>

            {/* Authentication Forms */}
            {showRegister ? (
              <RegisterForm 
                onToggleForm={toggleForm} 
                onSuccess={handleAuthSuccess}
              />
            ) : (
              <LoginForm 
                onToggleForm={toggleForm} 
                onSuccess={handleAuthSuccess}
              />
            )}

            {/* Divider */}
            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <GoogleSignInButton disabled={loading} />
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMicrosoftLogin}
                disabled={!authUrl || isLoading || loading}
                className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-3"></div>
                    Connecting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#f25022" d="M1 1h10v10H1z"/>
                      <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                      <path fill="#7fba00" d="M1 12h10v10H1z"/>
                      <path fill="#ffb900" d="M12 12h10v10H12z"/>
                    </svg>
                    <span className="group-hover:translate-x-1 transition-transform">
                      Continue with Microsoft
                    </span>
                  </div>
                )}
              </motion.button>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-center space-x-8 text-gray-400">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="text-xs">Enterprise Security</span>
                </div>
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-xs">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile feature preview */}
          <div className="lg:hidden mt-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Why Choose Data Cleansing Pro?</h3>
            </div>
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="bg-white rounded-lg p-4 shadow-sm border"
                >
                  <div className="flex items-center mb-2">
                    <feature.icon className="w-5 h-5 text-indigo-600 mr-3" />
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;