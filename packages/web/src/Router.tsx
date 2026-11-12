import React from 'react';
import { Route, Switch } from 'wouter';
import { Spinner } from './components/Spinner.tsx';
import NotFound from './views/NotFound.tsx';

const Home = React.lazy(() => import('./views/Home.tsx'));

const Dashboard = React.lazy(() => import('./views/Dashboard.tsx'));

export const Router = () => {
  return (
    <React.Suspense fallback={<Spinner />}>
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/dashboard">
          <Dashboard />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </React.Suspense>
  );
};
