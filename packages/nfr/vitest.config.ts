import { defineConfig } from 'vitest/config';
import { ENV } from './env.ts';

export default defineConfig({
  plugins: [
    {
      name: 'e2e-ui',
      configureVitest({ vitest, project }) {
        if (project.name !== 'e2e') return;

        if (vitest.config.ui) {
          project.config.env = { ...project.config.env, E2E_HEADED: '1' };
        }

        if (vitest.config.ui || ENV.E2E_HEADED === '1') project.config.testTimeout = 30_000;
      },
      configureServer(server) {
        const { ui, open, uiBase, api } = server.config.test;

        if (!ui || !open) return;

        const url = new URL(uiBase, 'http://localhost');
        url.searchParams.set('token', api.token);
        server.config.server.open = `${url.pathname}${url.search}`;
      },
    },
  ],
  test: {
    projects: [
      {
        test: {
          name: 'load',
          environment: 'node',
          include: ['load/*.load.spec.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['e2e/*.e2e.spec.ts'],
          testTimeout: 10_000,
          hookTimeout: 30_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
