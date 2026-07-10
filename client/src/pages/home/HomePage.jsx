import ExpenseByCompanyChart from './ExpenseByCompanyChart';
import ExpenseByExpenseHeadChart from './ExpenseByExpenseHeadChart';
import ExpenseByMonthChart from './ExpenseByMonthChart';

export default function HomePage() {
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ExpenseByCompanyChart />
        <ExpenseByExpenseHeadChart />
      </div>

      <ExpenseByMonthChart />
    </div>
  );
}
