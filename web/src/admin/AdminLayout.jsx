import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth.js';
import { useNeedsContent } from '../data/useNeedsContent.js';
import { DashboardIcon, PostsIcon, EventsIcon, TagsIcon, AlertIcon, LogoutIcon } from '../components/icons.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';

function navClass({ isActive }) {
  return isActive ? 'admin-nav-link active' : 'admin-nav-link';
}

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const { count: needsContentCount } = useNeedsContent();

  usePageMeta({ title: 'Admin', path: '/admin', noindex: true });

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">Admin</div>
        <nav className="admin-sidebar-nav">
          <NavLink to="/admin/dashboard" className={navClass}>
            <DashboardIcon size={17} /> Dashboard
          </NavLink>
          <NavLink to="/admin/posts" className={navClass}>
            <PostsIcon size={17} /> Posts
          </NavLink>
          <NavLink to="/admin/events" className={navClass}>
            <EventsIcon size={17} /> Events
          </NavLink>
          <NavLink to="/admin/tags" className={navClass}>
            <TagsIcon size={17} /> Tags
          </NavLink>
          <NavLink to="/admin/needs-content" className={navClass}>
            <AlertIcon size={17} /> Needs Content
            {needsContentCount > 0 && <span className="admin-nav-badge">{needsContentCount}</span>}
          </NavLink>
        </nav>
        <button onClick={handleLogout} className="admin-sidebar-logout">
          <LogoutIcon size={17} /> <span>Log out</span>
        </button>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
