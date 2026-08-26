# Environment variables

Environment variables are centralized in the [.env](./env).  
Available envs must be listed in the root `.env.sample` file.  
Each service must have its `env.ts` responsible for reading, parsing and exporting the `process.env` object using `zod`.  

NodeJS services read import and read the exported `ENV` object.  
Vite services read the global `import.meta.env` object created by Vite reading the `.env` file.

If a new env is needed:
- `.env.sample` must be updated to reflect the change.
- if the env is not a secret, service k8s confimap must be updated
- if the env is a secret, service k8s secretmap must be updated and CI pipeline must be updated

## NODE_ENV and APP_ENV

`NODE_ENV` variable indicates:
- `test`: the service is running in a test build.
- `development`: the service is running in a development build, where code is not minified nor optimized.
- `production`: the service is running in a production build, where code is minified and optimized.

Business logic must be agnostic to the `NODE_ENV` variable.  

`APP_ENV` variable indicates:
- `local`: the service is running on the developer's local machine.
- `development`: the service is running in `development` deployed environment.
- `staging`: the service is running in `staging` deployed environment.
- `production`: the service is running in `production` deployed environment.
