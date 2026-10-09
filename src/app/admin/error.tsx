"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="query-state" role="alert">
      <h1>Data could not be loaded</h1>
      <p>
        The staff API is unavailable or returned an unexpected response. Your
        filters are preserved.
      </p>
      <Button type="submit" variant="primary" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
