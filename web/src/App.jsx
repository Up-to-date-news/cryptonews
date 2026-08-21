import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
// Home and article are the two pages people actually land on directly (nav,
// search results, shared links) — kept in the main bundle so there's no
// extra chunk round-trip before the first paint of content. Everything
// else, especially the whole admin panel (forms, tag picker, timezone
// list), is lazy so anonymous readers never download code they can't use.
import ListPage from './pages/ListPage.jsx';
import ArticlePage from './pages/ArticlePage.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import Footer from './components/Footer.jsx';
import { SearchIcon, MoreIcon } from './components/icons.jsx';

const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const EventsPage = lazy(() => import('./pages/EventsPage.jsx'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage.jsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));
const AdminPostsListPage = lazy(() => import('./pages/AdminPostsListPage.jsx'));
const AdminCreatePostPage = lazy(() => import('./pages/AdminCreatePostPage.jsx'));
const AdminEditPostPage = lazy(() => import('./pages/AdminEditPostPage.jsx'));
const AdminEventsListPage = lazy(() => import('./pages/AdminEventsListPage.jsx'));
const AdminCreateEventPage = lazy(() => import('./pages/AdminCreateEventPage.jsx'));
const AdminEditEventPage = lazy(() => import('./pages/AdminEditEventPage.jsx'));
const AdminTagsPage = lazy(() => import('./pages/AdminTagsPage.jsx'));
const AdminNeedsContentPage = lazy(() => import('./pages/AdminNeedsContentPage.jsx'));
const AdminGuard = lazy(() => import('./admin/AdminGuard.jsx'));
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));

function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="site-logo" aria-label="Up to Date Crypto News">
          <img src="/logos/logo-web.svg" alt="Up to Date Crypto News" className="site-logo-img site-logo-img-web" />
          <img src="/logos/logo-mobile.svg" alt="Up to Date Crypto News" className="site-logo-img site-logo-img-mobile" />
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
    <Suspense fallback={<p className="status-message">Loading…</p>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<ListPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/event/:slug" element={<EventDetailPage />} />
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
    </Suspense>
  );
}
