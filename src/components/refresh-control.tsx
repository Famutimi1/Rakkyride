"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
/** Manual refresh preserves focused table rows; no automatic financial retries. */
export function RefreshControl() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [updated, setUpdated] = useState(false);
  return (
    <button
      className="text-link"
      disabled={pending}
      onClick={() =>
        start(() => {
          router.refresh();
          setUpdated(true);
        })
      }
    >
      {pending ? "Refreshing…" : updated ? "Refresh again" : "Refresh snapshot"}
    </button>
  );
}
