# Code - Backend

The separation of responsibilities between **controller** > **service** > **repository** must be respected and enforced.  
The data flows in order from the user, through controller, service, repository, data layer.

The data layer and presentation layer responsibilities separation must be respected and enforced:
- Back-end returns raw data (eg: ISO8601 for dates, numbers for amounts).
- Front-end formats and localizes the received raw data and presents it to the user (eg: localized string for dates, separators for numbers, currency symbol for amounts).

## Controller

Every action that a user or an agent can perform to retrieve or change the state of the application must go through the controller.

The controller is responsible for:
- Parsing, casting, and validating the input from the client.
- Routing the validated input from the client to the service.
- Presenting the service output from the service to the client.
- Managing authentication and authorization
- Exposing service functions as HTTP routes
- Exposing service functions as CLI commands, possibly consumed as timed jobs

No `ctx` is provided to the controller, only the necessary request parameters or body.  
Redirection and other routing functionalities are handled within the route definition.  

## Service

The service implements the business logic and orchestrates interactions between repositories and external services.

## Repository

The repository manages the access to datasources (database, cache) and exposes methods to retrieve or persist the data.

## Tree structure

```text
index.ts                      # nodejs entry point
router.ts                     # HTTP route definitions
cli.ts                        # CLI commands definitions
<resource>/
├── <Resource>Controller.ts   # Default export class with static methods
├── <Resource>Service.ts      # Default export class with static methods
└── <Resource>Repository.ts   # Default export object for datasource access
```

## Guidelines

- Use `console.log` and `console.error` appropriately
- Use `throw new <HttpError>(<code>, <message>)` to throw errors in controllers, services, and repositories
- Thrown errors should be constants
- Validate both request input and response output
- Provide API documentation documenting accepted inputs and expected outputs
- Provide a health check endpoint that returns the API state
- Avoid repeating the resource name in the method name: `UserService.greetUser()` is incorrect; `UserService.greet()` is correct.
