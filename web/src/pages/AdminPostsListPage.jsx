import AdminPostsList from '../components/AdminPostsList.jsx';

export default function AdminPostsListPage() {
  return (
    <AdminPostsList
      title="Posts"
      filterOrigin={(origin) => origin === 'manual'}
      newPostLink="/admin/posts/new"
      searchPlaceholder="Search posts…"
      emptyMessage="No posts match."
    />
  );
}
