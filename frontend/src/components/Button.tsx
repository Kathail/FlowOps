import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * Single source of truth for buttons. Variants map to existing
 * `.btn-*` Tailwind utilities in `index.css`. Drop in anywhere instead
 * of hand-rolling `bg-blue-500 px-3 py-1.5 text-sm` etc.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  // Slightly more presence than ghost — for "Cancel" / secondary CTAs.
  secondary: "btn-ghost",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "!px-2 !py-1 !text-xs",
  md: "",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${VARIANT[variant]} ${SIZE[size]} ${className}`.trim()}
      {...rest}
    />
  );
});
