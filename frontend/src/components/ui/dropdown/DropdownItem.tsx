import type React from "react";
import { Link } from "react-router";

interface DropdownItemProps {
  to?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const BASE_CLASSES =
  "flex w-full items-center gap-3 px-3 py-2 rounded-lg text-theme-sm font-medium " +
  "text-gray-700 hover:bg-gray-100 hover:text-gray-900 " +
  "dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300";

export const DropdownItem: React.FC<DropdownItemProps> = ({
  to,
  onClick,
  className = "",
  children,
}) => {
  const classes = `${BASE_CLASSES} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
};
