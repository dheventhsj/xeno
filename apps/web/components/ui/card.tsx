import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  hover = true
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={clsx("glass p-6", hover && "glass-hover", className)}>{children}</div>;
}
