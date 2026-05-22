export default function Panel({ children, className = "", as: Component = "section", ...props }) {
  return (
    <Component className={`glass rounded-lg ${className}`} {...props}>
      {children}
    </Component>
  );
}
