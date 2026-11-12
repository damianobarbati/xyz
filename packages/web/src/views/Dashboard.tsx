import { Redirect, useLocation } from 'wouter';
import { TOKEN_KEY } from '../api.ts';
import { Chat } from '../components/Chat.tsx';
import { useSession } from '../hooks/useSession.ts';

type DashboardProps = { className?: string };

export const Dashboard = ({ className }: DashboardProps) => {
  const session = useSession();
  const [, navigate] = useLocation();

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/', { replace: true });
  };

  if (!session.token || session.unauthorized) return <Redirect to="/" replace />;

  if (session.isLoading) return <p role="status">Loading...</p>;

  if (session.error)
    return (
      <div role="alert">
        Unable to load your dashboard.{' '}
        <button type="button" onClick={() => session.mutate()}>
          Try again
        </button>
      </div>
    );

  if (!session.data) return <p role="status">Loading...</p>;

  return (
    <main className={className}>
      <div className="mx-auto flex h-dvh max-w-4xl flex-col gap-4 p-3 sm:p-6">
        <header className="flex items-center justify-between gap-4 px-1">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Chat</h1>
            <p className="mt-1 text-sm text-slate-600">Welcome, {session.data.name}.</p>
          </div>
          <button
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            type="button"
            onClick={logout}
          >
            Logout
          </button>
        </header>
        <Chat
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
          token={session.token}
          userId={session.data.id}
        />
      </div>
    </main>
  );
};

export default Dashboard;
