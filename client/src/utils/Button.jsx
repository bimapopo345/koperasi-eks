/* eslint-disable react/prop-types */
/**
 * Button component with customizable styles and states
 * @param {React.ReactNode} children - Button content
 * @param {"button" | "submit" | "reset"} [type="button"] - Button type
 * @param {"small" | "medium" | "large"} [size="medium"] - Button size
 * @param {"rounded" | "pill" | "square"} [shape="rounded"] - Button shape
 * @param {string} [bgColor="bg-blue-600"] - Background color classes
 * @param {string} [textColor="text-white"] - Text color classes
 * @param {string} [className=""] - Additional CSS classes
 * @param {boolean} [isLoading=false] - Loading state
 * @param {boolean} [block=false] - Full width button
 * @param {boolean} [disabled=false] - Disabled state
 * @param {...Object} props - Additional button attributes
 */
export default function Button({
  children,
  type = "button",
  size = "medium",
  shape = "rounded",
  bgColor = "bg-blue-600",
  textColor = "text-white",
  className = "",
  isLoading = false,
  block = false,
  disabled = false,
  ...props
}) {
  // Size classes
  const sizeClasses = {
    small: "px-2 py-1 text-sm",
    medium: "px-4 py-2 text-base",
    large: "px-6 py-3 text-lg",
  };

  // Shape classes
  const shapeClasses = {
    rounded: "rounded-lg",
    pill: "rounded-full",
    square: "rounded-none",
  };

  return (
    <button
      type={type}
      className={`flex items-center justify-center ${bgColor} ${textColor} ${
        sizeClasses[size]
      } ${shapeClasses[shape]} ${
        block ? "w-full" : ""
      } ${className} transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="loader w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      ) : (
        children
      )}
    </button>
  );
}
