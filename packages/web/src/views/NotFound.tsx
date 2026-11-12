type NotFoundProps = {
  className?: string;
};

export const NotFound = ({ className }: NotFoundProps) => {
  return <h1 className={className}>Not found</h1>;
};

export default NotFound;
