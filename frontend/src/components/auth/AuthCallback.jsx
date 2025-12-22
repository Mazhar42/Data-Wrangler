import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AuthCallback = () => {
  const { loginWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    const processAuth = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      
      if (code) {
        if (processedRef.current) return;
        processedRef.current = true;

        try {
          if (location.pathname === '/auth/google/callback') {
            await loginWithGoogle(code);
          }
          navigate('/dashboard');
        } catch (error) {
          console.error('Authentication failed:', error);
          navigate('/login?error=auth_failed');
        }
      } else {
        navigate('/login?error=no_code');
      }
    };

    processAuth();
  }, [location, navigate, loginWithGoogle]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-800">Authenticating...</h1>
        <p className="text-gray-600">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
