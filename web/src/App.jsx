import { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import ListPage from './pages/ListPage.jsx';
import ArticlePage from './pages/ArticlePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminPostsListPage from './pages/AdminPostsListPage.jsx';
import AdminCreatePostPage from './pages/AdminCreatePostPage.jsx';
import AdminEditPostPage from './pages/AdminEditPostPage.jsx';
import AdminEventsListPage from './pages/AdminEventsListPage.jsx';
import AdminCreateEventPage from './pages/AdminCreateEventPage.jsx';
import AdminEditEventPage from './pages/AdminEditEventPage.jsx';
import AdminTagsPage from './pages/AdminTagsPage.jsx';
import AdminNeedsContentPage from './pages/AdminNeedsContentPage.jsx';
import AdminGuard from './admin/AdminGuard.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Footer from './components/Footer.jsx';
import { SearchIcon, MoreIcon } from './components/icons.jsx';

function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="site-logo" aria-label="up to date news">
          <img src="/logos/logo-web.svg" alt="up to date news" className="site-logo-img site-logo-img-web" />
          <img src="/logos/logo-mobile.svg" alt="up to date news" className="site-logo-img site-logo-img-mobile" />
        </Link>
        <nav className="site-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>News</NavLink>
          <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>Event</NavLink>
          <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active' : '')}>Contact</NavLink>
        </nav>
        <div className="site-header-right">
          <Link to="/search" className="search-link" aria-label="Search"><SearchIcon size={18} /></Link>
          <ThemeToggle />
          <button type="button" className="mobile-menu-toggle" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <MoreIcon size={20} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu-overlay">
          <button type="button" className="mobile-menu-back" onClick={() => setMenuOpen(false)}>← Back</button>
          <nav className="mobile-menu-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>News</NavLink>
            <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>Event</NavLink>
            <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active' : '')}>Contact</NavLink>
          </nav>
        </div>
      )}

      <main>
        <Outlet />
      </main>
      <Footer />
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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
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
        <Route path="tags" element={<AdminTagsPage />} />
        <Route path="needs-content" element={<AdminNeedsContentPage />} />
      </Route>
    </Routes>
  );
}
