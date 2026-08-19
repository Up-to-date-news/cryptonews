import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth.js';

export default function AdminGuard({ children }) {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
