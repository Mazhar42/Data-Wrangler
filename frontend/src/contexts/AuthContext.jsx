import { useReducer, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { AuthContext } from './auth';

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload, 
        loading: false 
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    
    case 'LOGOUT':
      return { 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        loading: false
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};



export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing token on app start
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        dispatch({ type: 'SET_TOKEN', payload: token });
        try {
          const user = await authAPI.getCurrentUser();
          dispatch({ type: 'SET_USER', payload: user });
        } catch {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  // Email/Password authentication
  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.register(userData);
      const { access_token, user } = response;
      
      localStorage.setItem('token', access_token);
      dispatch({ type: 'SET_TOKEN', payload: access_token });
      dispatch({ type: 'SET_USER', payload: user });
      
      return response;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const loginWithPassword = async (credentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.login(credentials);
      const { access_token, user } = response;
      
      localStorage.setItem('token', access_token);
      dispatch({ type: 'SET_TOKEN', payload: access_token });
      dispatch({ type: 'SET_USER', payload: user });
      
      return response;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Microsoft OAuth
  const loginWithMicrosoft = async (code) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.microsoftCallback(code);
      const { access_token, user } = response;
      
      localStorage.setItem('token', access_token);
      dispatch({ type: 'SET_TOKEN', payload: access_token });
      dispatch({ type: 'SET_USER', payload: user });
      
      return response;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const getMicrosoftAuthUrl = async () => {
    const response = await authAPI.getMicrosoftAuthUrl();
    return response.auth_url;
  };

  // Google OAuth
  const loginWithGoogle = async (code) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.googleCallback(code);
      const { access_token, user } = response;
      
      localStorage.setItem('token', access_token);
      dispatch({ type: 'SET_TOKEN', payload: access_token });
      dispatch({ type: 'SET_USER', payload: user });
      
      return response;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const getGoogleAuthUrl = async () => {
    const response = await authAPI.getGoogleAuthUrl();
    return response.auth_url;
  };

  // Common
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  // Legacy support - keep the old login method for backward compatibility
  const login = loginWithMicrosoft;

  const value = {
    ...state,
    // Email/Password
    register,
    loginWithPassword,
    
    // Microsoft OAuth
    loginWithMicrosoft,
    getMicrosoftAuthUrl,
    
    // Google OAuth
    loginWithGoogle,
    getGoogleAuthUrl,
    
    // Common
    login, // Legacy support
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


