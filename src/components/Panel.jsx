export default function Panel({ children, className = "", as: Component = "section", ...props }) {
  return (
    <Component className={`glass rounded-[var(--hz-radius-md)] ${className}`} {...props}>
      {children}
    </Component>
  );
}
