"use client";
import { useState } from "react";
export function CopyButton({ value }: { value: string }) {
  const [label, setLabel] = useState("Copy ID");
  return (
    <button
      className="button secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setLabel("Copied");
        } catch {
          setLabel("Copy unavailable");
        }
      }}
    >
      {label}
    </button>
  );
}
