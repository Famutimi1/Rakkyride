"use client";
import { useEffect, useState } from "react";
import { QueryState } from "./primitives";
export function DocumentViewer({
  userId,
  kind,
  available,
  preview,
}: {
  userId: string;
  kind: string;
  available: boolean;
  preview: boolean;
}) {
  const [document, setDocument] = useState<{
      url: string;
      type: string;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!available || preview) return;
    const controller = new AbortController();
    let url: string | undefined;
    setLoading(true);
    setError("");
    setDocument(null);
    void fetch(`/api/admin/driver-applications/${userId}/documents/${kind}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("The document could not be opened.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setDocument({ url, type: blob.type });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Document unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [userId, kind, available, preview]);
  if (preview)
    return (
      <QueryState
        title="Private document preview"
        message="Fictional applications do not include identity documents. Actual documents are served through an authenticated, audited request."
        icon="file"
      />
    );
  if (!available)
    return (
      <QueryState
        title="Document missing"
        message="The application has no uploaded file for this document."
        icon="file"
      />
    );
  if (loading)
    return (
      <QueryState
        title="Loading document…"
        message="Fetching the private application file."
        icon="file"
      />
    );
  if (error || !document)
    return (
      <QueryState
        title="Document unavailable"
        message={error || "The document has not loaded."}
        icon="alert"
      />
    );
  return (
    <div className="document-content">
      {document.type === "application/pdf" ? (
        <iframe
          title={`${kind} document`}
          src={document.url}
          sandbox="allow-same-origin"
        />
      ) : (
        <img
          src={document.url}
          alt={`${kind} document submitted by applicant`}
        />
      )}
      <a
        className="text-link"
        href={document.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open document at full size ↗
      </a>
    </div>
  );
}
