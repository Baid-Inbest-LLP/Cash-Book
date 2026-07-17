import { NavLink, Outlet, useLocation } from 'react-router-dom';
import PageBanner from '../../components/common/PageBanner';
import { ROUTES } from '../../constants';

const tabs = [
  { label: 'Companies', to: ROUTES.CONTROL_CENTER_COMPANIES },
  { label: 'Expense Heads', to: ROUTES.CONTROL_CENTER_EXPENSE_HEADS },
];

export default function ControlCenterLayout() {
  const location = useLocation();
  const subtitle = location.pathname.includes('expense-heads')
    ? 'Manage expense categories used to classify payments'
    : 'Legal entities, branch locations, and expense heads';

  return (
    <div>
      <PageBanner className="mb-4" title="Control Center" subtitle={subtitle} />

      <div className="control-center-tabs-shell mb-4">
        <div className="control-center-tabs-list" role="tablist" aria-label="Control Center">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                isActive ? 'control-center-tab control-center-tab--active' : 'control-center-tab'
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
