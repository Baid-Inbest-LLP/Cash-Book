import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../../constants';

const tabs = [
  { label: 'Companies', to: ROUTES.CONTROL_CENTER_COMPANIES },
  { label: 'Expense Heads', to: ROUTES.CONTROL_CENTER_EXPENSE_HEADS },
];

export default function ControlCenterLayout() {
  return (
    <div className="space-y-4">
      <div className="control-center-tabs-shell">
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
