import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={clsx(
        "relative px-4 py-2 rounded-xl font-medium text-white",
        "bg-gradient-to-r from-violet-600/80 to-sky-500/70 hover:from-violet-500 hover:to-sky-400",
        "border border-white/15 shadow-[0_8px_30px_rgba(124,58,237,0.35)]",
        "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        className
      )}
    >
      {children}
    </button>
  );
}
