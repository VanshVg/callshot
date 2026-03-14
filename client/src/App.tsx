import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReactNode } from 'react';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { Dashboard } from './pages/Dashboard';
import { GroupDetail } from './pages/GroupDetail';
import { Predictions } from './pages/Predictions';
import { GroupPredictions } from './pages/GroupPredictions';
import { GroupMatches } from './pages/GroupMatches';
import { MatchPredict } from './pages/MatchPredict';
import { Leaderboard } from './pages/Leaderboard';
import { Cards } from './pages/Cards';
import { Admin } from './pages/Admin';
import { Rules } from './pages/Rules';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/verify-email" element={user ? <Navigate to="/dashboard" replace /> : <VerifyEmail />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
      <Route path="/groups/:groupId/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
      <Route path="/groups/:groupId/predictions/all" element={<ProtectedRoute><GroupPredictions /></ProtectedRoute>} />
      <Route path="/groups/:groupId/matches" element={<ProtectedRoute><GroupMatches /></ProtectedRoute>} />
      <Route path="/groups/:groupId/matches/:matchId/predict" element={<ProtectedRoute><MatchPredict /></ProtectedRoute>} />
      <Route path="/groups/:groupId/cards" element={<ProtectedRoute><Cards /></ProtectedRoute>} />
      <Route path="/groups/:groupId/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/rules" element={<Rules />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
