# GIT

- Branch naming format is: `<type>-<ticker-number>-<summary>`: (`feat-34-users-view`, `fix-89-unity-sync`).
- PR naming format is: `<type> <number>: <summary>`: (`Feature 34: Users view`, `Fix 89: Unity sync`).
- PR must be squash-merged into `main` branch.

Code change type can be `feat`, `fix`, `chore`, `perf`.

PR description must contain a summary of what was done containing 2 main sections: "Problem" and "Solution".

## Continuous integration and delivery (CI/CD)
- CI is powered by GitHub Actions, workflow is in [ci.yml](../.github/workflows/ci.yml)
- PR on `main` branch are tested but not deployed to any environment.
- commits on `main` branch are tested then deployed to the development environment.
- commits on `staging` branch are tested then deployed to the staging environment.
- commits on `production` branch are tested then deployed to the production environment.
