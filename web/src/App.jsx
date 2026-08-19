import { Routes, Route, Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import ListPage from './pages/ListPage.jsx';
import ArticlePage from './pages/ArticlePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminPostsListPage from './pages/AdminPostsListPage.jsx';
import AdminCreatePostPage from './pages/AdminCreatePostPage.jsx';
import AdminEditPostPage from './pages/AdminEditPostPage.jsx';
import AdminEventsListPage from './pages/AdminEventsListPage.jsx';
import AdminCreateEventPage from './pages/AdminCreateEventPage.jsx';
import AdminEditEventPage from './pages/AdminEditEventPage.jsx';
import AdminGuard from './admin/AdminGuard.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { SearchIcon } from './components/icons.jsx';

function PublicLayout() {
  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="site-logo">up to date news</Link>
        <nav className="site-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>News</NavLink>
          <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>Event</NavLink>
        </nav>
        <div className="site-header-right">
          <Link to="/search" className="search-link" aria-label="Search"><SearchIcon size={18} /></Link>
          <ThemeToggle />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ListPage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="posts" element={<AdminPostsListPage />} />
        <Route path="posts/new" element={<AdminCreatePostPage />} />
        <Route path="posts/:id/edit" element={<AdminEditPostPage />} />
        <Route path="events" element={<AdminEventsListPage />} />
        <Route path="events/new" element={<AdminCreateEventPage />} />
        <Route path="events/:id/edit" element={<AdminEditEventPage />} />
      </Route>
    </Routes>
  );
}
