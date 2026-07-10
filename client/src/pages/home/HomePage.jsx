import DashboardStats from './DashboardStats';
import ExpenseByCompanyChart from './ExpenseByCompanyChart';
import ExpenseByExpenseHeadChart from './ExpenseByExpenseHeadChart';
import ExpenseByMonthChart from './ExpenseByMonthChart';
import TopExpenseHeadsTable from './TopExpenseHeadsTable';
import RecentEntriesTable from './RecentEntriesTable';

export default function HomePage() {
  return (
    <div>
      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ExpenseByCompanyChart />
        <ExpenseByExpenseHeadChart />
      </div>

      <ExpenseByMonthChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <TopExpenseHeadsTable />
        <RecentEntriesTable />
      </div>
    </div>
  );
}
