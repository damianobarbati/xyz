# Code - Frontend

The data layer and presentation layer responsibilities separation must be respected and enforced:
- Back-end returns raw data (e.g., ISO8601 for dates, numbers for amounts).
- Front-end formats and localizes the received raw data and presents it to the user (e.g., localized strings for dates, separators for numbers, currency symbols for amounts).

## React components
Use functional components and hooks.

Each component must:
- Be placed in a file named after it.
- Be exported using the `export const Component = () => {}` syntax.
- Have its props properly typed with a `<ComponentName>Props` type defined above the component.
- Import built-in React hooks via the `React` namespace (e.g., `React.useState()`) rather than directly.
- Use `useMemo` and `useCallback` **only if** React Compiler doesn't already optimize them and when the performance benefit outweighs the maintenance overhead.
- Use custom hooks **only** when the reuse/performance benefit outweighs the maintenance overhead.
- Do not split a view or component into multiple sub-components if they are not reused elsewhere and complexity remains manageable.
- Avoid external libraries unless strictly necessary and always evaluate bundle size impact.
- Avoid nested ternaries in JSX. Prefer early returns / guard clauses for multi-branch rendering, or clean single-level conditions.

## Styling
- Use Tailwind utility classes.
- Encapsulate frequently reused styles inside reusable components in `ui/` instead of abstracting CSS classes with `@apply`.
- Avoid inline `style` properties unless dynamically computed.
- Avoid CSS-in-JS solutions.

## UX
UX must be provided as a Figma board.

Figma board must include the UI kit with:
- Typography.
- Icon set from react-icons.
- Buttons with possible statuses and interactions.
- Inputs with possible statuses and interactions, declined by type (eg: text, number, date, currency).
- Snackbar for quick visual feedback on actions, such as success, warning or error.
- Confirmation prompts for quick yes/no input from the user.
- Table with the search bar and available filters.

Figma board must be composed using the UI kit.  
Figma board must provide each view for the following resolutions:
- Desktop: 1280 x 700
- Tablet: 768x1024
- Smartphone: 390x844

UI must respect responsive design principles, which means that as the viewport shrinks the elements can either and only be stacked or be hidden: the DOM structure of the HTML document do not change between resolutions and/or users.

## Application state
- Use `zustand` to manage application/domain state with plain objects.
- Do not use React Context for global state (scoped compound UI components excepted).

## Data fetching and mutations
- Use `useSWR` to retrieve data and `useSWRMutation` to perform backend mutations.
- Avoid combinations of `fetch`/`axios` with manual `useState` and `useEffect` for data fetching.
- Use meaningful, cache-friendly fetcher keys and display loading spinners/skeletons for async operations.

## Form handling
- Use `react-hook-form` to handle forms.
- Use native `<form>` elements with proper input/button types to allow submission on `Enter`.

## Naming Convention
For an entity like `User`, use the following component naming conventions:
- `User` (e.g., a full page of user data, like a public profile page)
- `UserGrid` (e.g., an explorer with a list of cards in grid format)
- `UserGridItem` (e.g., a single card within a grid)
- `UserList` (e.g., a dashboard with a list of rows in table format)
- `UserListItem` (e.g., a single row within a table)
- `UserCreationForm` and `UserUpdateForm`

## Tree structure

```text
main.tsx                # root React element
Router.tsx              # react-router routes
components/
├── Offer.tsx
├── OfferList.tsx
├── OfferListItem.tsx   
hooks/
├── useMe.ts
ui/                     # reused UI primitives
├── icons.tsx           # exported react-icons 
├── Button.tsx
views/                  # route-level components (except shared layouts)
├── Layout.tsx
├── Header.tsx
├── Footer.tsx
├── Home.tsx
├── Offers.tsx
```
