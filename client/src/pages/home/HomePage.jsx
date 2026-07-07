import { useMe } from '../../hooks/useAuth';
import PageBanner from '../../components/common/PageBanner';

export default function HomePage() {
  const { data: user } = useMe();

  return (
    <div>
      <PageBanner
        className="mb-6"
        title={`Welcome${user?.name ? `, ${user.name}` : ''}`}
        subtitle="Cash Book — manage your cash book entries and reports."
      />
    </div>
  );
}
