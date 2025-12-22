import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useNavigate } from 'react-router-dom';


// Components
import LoginPage from './components/auth/LoginPage';
import AuthCallback from './components/auth/AuthCallback';
import ProjectDashboard from './components/projects/ProjectDashboard';
import ProjectDetail from './components/projects/ProjectDetail';
import ProtectedRoute from './components/common/ProtectedRoute';
import HistoryLog from './HistoryLog'; // Import HistoryLog
import UserManager from './components/admin/UserManager';
import UserAdmin from './components/admin/UserAdmin.jsx';
import GroupAdmin from './components/admin/GroupAdmin.jsx';

// Protected Route Component
function ProtectedRouteWrapper({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? (
    <ProtectedRoute>{children}</ProtectedRoute>
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  return (
    <AuthProvider>
        <Toaster />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/google/callback" element={<AuthCallback />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRouteWrapper>
                    <ProjectDashboard />
                  </ProtectedRouteWrapper>
                } 
              />
              <Route 
                path="/projects/:id" 
                element={
                  <ProtectedRouteWrapper>
                    <ProjectDetail />
                  </ProtectedRouteWrapper>
                } 
              />
              <Route 
                path="/projects/:id/files/:fileId" 
                element={
                  <ProtectedRouteWrapper>
                    <ProjectDetail />
                  </ProtectedRouteWrapper>
                } 
              />
              <Route 
                path="/projects/:id/history" 
                element={
                  <ProtectedRouteWrapper>
                    <HistoryLog />
                  </ProtectedRouteWrapper>
                } 
              />

              {/* Admin */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRouteWrapper>
                    <UserAdmin />
                  </ProtectedRouteWrapper>
                } 
              />

              {/* Group Admin */}
              <Route 
                path="/admin/groups-admin" 
                element={
                  <ProtectedRouteWrapper>
                    <GroupAdmin />
                  </ProtectedRouteWrapper>
                } 
              />
              
              {/* Default redirect */}
              <Route 
                path="/" 
                element={
                  <AuthGuard />
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
  );
}

// Auth Guard for root path
function AuthGuard() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

export default App;
