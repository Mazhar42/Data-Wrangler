import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';


import { LogIn, Sparkles, Database, TrendingUp, Shield, Play } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import GoogleSignInButton from './GoogleSignInButton';

const LoginPage = () => {
  const { loading, loginAsDemo } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    // The auth context will handle redirecting to the dashboard
    // This is just for any additional success handling if needed
    console.log('Authentication successful');
  };

  const handleDemoLogin = async () => {
    try {
      await loginAsDemo();
      
      // Fetch projects to find the demo project
      const { projectsAPI } = await import('../../utils/api');
      const projects = await projectsAPI.getAll();
      if (projects && projects.length > 0) {
        navigate(`/projects/${projects[0].id}`);
      } else {
        // Fallback if no project found (should not happen based on backend)
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Demo login failed", error);
    }
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
      description: "Your data is protected with enterprise-grade security"
    }
  ];

  return (
    <div className="h-screen flex bg-white">
      {/* Right Side - Brand & Info (Dark panel) */}
      <div className="hidden lg:flex lg:w-2/5 h-full bg-neutral-900 p-10 text-white relative overflow-hidden">
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
        
        <div className="relative z-10 flex flex-col justify-center max-w-lg h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center mb-6">
              <Sparkles className="w-8 h-8 mr-3" />
              <h1 className="text-3xl font-thin tracking-tighter">Agentic AI Data Wrangler</h1>
            </div>
            
            <h2 className="text-base font-normal mb-4 leading-tight">
              Transform Your Data with 
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                Intelligent Processing
              </span>
            </h2>
            
            <p className="text-sm text-indigo-100 mb-8 leading-relaxed max-w-md">
              Streamline your data workflow with our powerful cleansing tools. 
              Create projects, upload files, and apply sophisticated transformations 
              with an intuitive interface designed for professionals.
            </p>
          </motion.div>

          <div className="space-y-5">
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
                  <h3 className="font-normal text-lg mb-2">{feature.title}</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-10 z-20 text-indigo-100 text-xs">
          © 2025 <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">Ark Software Solutions Ltd.</span> All rights reserved
        </div>
      </div>

      {/* Left Side - Authentication (Pure white) */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-10 bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <div className="h-full">

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
            <div className="flex flex-col items-center justify-center gap-3">
              <GoogleSignInButton disabled={loading} />
              
              <div className="w-full max-w-sm mt-4">
                  <button
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg group"
                  >
                    <div className="p-1 bg-white/20 rounded-full">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold">Try Demo Mode</span>
                      <span className="text-xs text-indigo-100">No account required • Limited features</span>
                    </div>
                  </button>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="hidden md:block mt-8 text-gray-400 text-xs">
              <div className="flex items-center justify-start space-x-6">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  <span>Enterprise Security</span>
                </div>
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
          {/* Mobile feature preview is removed for cleaner full-screen layout */}
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;