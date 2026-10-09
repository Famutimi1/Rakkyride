"use client";
import { Button } from "./ui/button";
import { useState } from "react";
export function CopyButton({ value }: { value: string }) {
  const [label, setLabel] = useState("Copy ID");
  return (
    <Button
      type="submit"
      variant="secondary"
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
    </Button>
  );
}
