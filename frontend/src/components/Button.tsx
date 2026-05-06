import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * Single source of truth for buttons. Variants map to the `.btn-*`
 * Tailwind utilities in `index.css`; size composes a separate
 * `.btn-sm` class that overrides padding + text size via cascade
 * order (no `!important` needed).
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...rest },
  ref,
) {
  const classes = [VARIANT[variant], SIZE[size], className].filter(Boolean).join(" ");
  return <button ref={ref} type={type} className={classes} {...rest} />;
});
