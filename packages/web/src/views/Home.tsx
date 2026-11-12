import React from 'react';
import { Redirect } from 'wouter';
import { AuthForm } from '../components/AuthForm.tsx';
import { useSession } from '../hooks/useSession.ts';

type HomeProps = { className?: string };

export const Home = ({ className }: HomeProps) => {
  const [registering, setRegistering] = React.useState(false);
  const session = useSession();

  if (session.isLoading) return <p role="status">Signing in...</p>;

  if (session.token && session.error && !session.unauthorized)
    return (
      <div role="alert">
        Unable to restore your session.{' '}
        <button type="button" onClick={() => session.mutate()}>
          Try again
        </button>
      </div>
    );

  if (session.data && !session.error) return <Redirect to="/dashboard" replace />;

  return (
    <main className={className}>
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-12">
        <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="mb-6 text-2xl font-semibold">{registering ? 'Create account' : 'Sign in'}</h1>
          <AuthForm key={String(registering)} registering={registering} onRegistered={() => setRegistering(false)} />
          <button
            className="mt-6 w-full text-sm text-slate-600 underline underline-offset-4"
            type="button"
            onClick={() => setRegistering(!registering)}
          >
            {registering ? 'Already have an account? Sign in' : 'Create an account'}
          </button>
        </section>
      </div>
    </main>
  );
};

export default Home;
