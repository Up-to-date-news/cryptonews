import AdminPostsList from '../components/AdminPostsList.jsx';

export default function AdminAIPostsListPage() {
  return (
    <AdminPostsList
      title="AI Posts"
      filterOrigin={(origin) => origin !== 'manual'}
      searchPlaceholder="Search AI posts…"
      emptyMessage="No AI-generated posts match."
      showContentBadge
    />
  );
}
