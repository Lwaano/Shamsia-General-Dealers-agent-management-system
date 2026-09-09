import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'MANAGER', 'TELLER'] },
  { to: '/float', label: 'Float', icon: '💰', roles: ['ADMIN', 'MANAGER', 'TELLER'] },
  { to: '/reconciliation', label: 'Day Reconciliation', icon: '🧮', roles: ['ADMIN', 'MANAGER', 'TELLER'] },
  { to: '/transactions', label: 'Transactions', icon: '🔄', roles: ['ADMIN', 'MANAGER', 'TELLER'] },
  { to: '/inventory', label: 'Inventory', icon: '📦', roles: ['ADMIN', 'MANAGER', 'TELLER'] },
  { to: '/agents', label: 'Agents, Providers & Branches', icon: '🧑‍💼', roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Users', icon: '👤', roles: ['ADMIN'] },
  { to: '/audit-log', label: 'Audit Log', icon: '🕵️', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-brand-950 text-slate-100">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">S</div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Shamsia</p>
            <p className="text-xs text-brand-200">General Dealers</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-brand-900'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-brand-900 px-4 py-4">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-brand-300">{user?.position || user?.role}</p>
          <p className="truncate text-xs text-brand-400">{user?.branch ? user.branch.name : 'Head Office - All Branches'}</p>
          <button onClick={handleLogout} className="mt-3 text-xs font-medium text-brand-200 hover:text-white">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
