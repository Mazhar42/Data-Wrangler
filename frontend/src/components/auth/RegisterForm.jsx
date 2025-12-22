import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const RegisterForm = ({ onToggleForm, onSuccess }) => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      onSuccess?.();
      navigate('/dashboard');
    } catch (error) {
      const message = error?.message || 'Failed to register';
      setErrors({ submit: message });
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-6 w-full"
    >
      <div className="mb-4">
        <h2 className="text-[28px] leading-tight font-normal text-gray-900">Register</h2>
      </div>

      {/* Name field */}
      <div className="space-y-2">
        <div className="relative">
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className={`block w-full max-w-md pl-2 pr-3 py-2 border text-[15px] placeholder:text-xs ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            } rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brandNavy focus:border-brandNavy`}
            placeholder="Enter your full name"
          />
        </div>
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`block w-full max-w-md pl-2 pr-3 py-2 border text-[15px] placeholder:text-xs ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            } rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brandNavy focus:border-brandNavy`}
            placeholder="Enter your email"
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <div className="relative">
          <div
            className={`flex items-center w-full max-w-md rounded-md bg-white border ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            } focus-within:ring-1 focus-within:ring-brandNavy focus-within:border-brandNavy`}
          >
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="flex-1 pl-2 pr-2 py-2 text-[15px] placeholder:text-xs placeholder-gray-400 border-none outline-none focus:outline-none"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="px-2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.password}
          </p>
        )}
      </div>

      {/* Confirm Password field */}
      <div className="space-y-2">
        <div className="relative">
          <div
            className={`flex items-center w-full max-w-md rounded-md bg-white border ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            } focus-within:ring-1 focus-within:ring-brandNavy focus-within:border-brandNavy`}
          >
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="flex-1 pl-2 pr-2 py-2 text-[15px] placeholder:text-xs placeholder-gray-400 border-none outline-none focus:outline-none"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(prev => !prev)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="px-2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errors.submit}
          </p>
        </div>
      )}

      {/* Submit button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-normal text-sm py-1.5 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {isSubmitting ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Creating account...
          </div>
        ) : (
          <div className="flex items-center">Create account</div>
        )}
      </motion.button>
    </motion.form>
  );
};

export default RegisterForm;
