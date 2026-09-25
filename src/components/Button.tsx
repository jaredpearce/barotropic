interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary: "bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-400",
  secondary: "border border-sky-300 text-sky-700 hover:bg-sky-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400",
};

const sizeStyles = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-semibold transition-colors ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}
