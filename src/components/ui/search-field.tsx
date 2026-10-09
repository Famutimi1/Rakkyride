"use client";
import type { InputHTMLAttributes } from "react";
import { Icon } from "../icon";
export function SearchField({
  label,
  onSearch,
  onClear,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  onSearch?: (value: string) => void;
  onClear?: () => void;
}) {
  return (
    <div className={`search-input ${className}`}>
      <Icon name="search" />
      <input
        {...props}
        type="search"
        aria-label={label}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (event.key === "Enter" && onSearch) {
            event.preventDefault();
            onSearch(event.currentTarget.value);
          }
        }}
      />
      {onClear && props.value && (
        <button
          type="button"
          className="icon-button search-clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={onClear}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
