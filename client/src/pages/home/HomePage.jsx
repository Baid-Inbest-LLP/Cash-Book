import { useSelector } from 'react-redux';
import PageBanner from '../../components/common/PageBanner';

export default function HomePage() {
  const { user } = useSelector((state) => state.auth);

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
