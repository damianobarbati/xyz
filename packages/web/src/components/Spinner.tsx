type SpinnerProps = { className?: string };

export const Spinner = ({ className = 'grid size-full place-items-center' }: SpinnerProps) => {
  return (
    <span className={className} role="status" aria-label="Loading">
      <span className="auth-spinner" aria-hidden="true" />
    </span>
  );
};
