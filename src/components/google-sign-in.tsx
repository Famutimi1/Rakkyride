"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    ux_mode: "popup";
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "signin_with";
      shape: "rectangular";
      width: number;
    },
  ): void;
}

export function GoogleSignIn({
  clientId,
  disabled,
  onPending,
}: {
  clientId?: string;
  disabled: boolean;
  onPending: (pending: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const pending = useRef(onPending);
  pending.current = onPending;
  const [scriptReady, setScriptReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<
    "loading" | "ready" | "signing-in" | "error"
  >("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scriptReady || !clientId || !container.current) return;
    const element = container.current;
    const controller = new AbortController();
    let active = true;
    let submitting = false;
    setPhase("loading");
    setError("");
    async function signIn(idToken: string) {
      if (!active || submitting) return;
      submitting = true;
      pending.current(true);
      setPhase("signing-in");
      try {
        const response = await fetch("/api/session/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          signal: AbortSignal.timeout(15000),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(
            data.error ?? "Google sign-in could not be completed.",
          );
        window.location.assign("/admin");
      } catch (failure) {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Google sign-in could not be completed. Try again.",
          );
          setPhase("error");
        }
      } finally {
        pending.current(false);
      }
    }
    async function prepare() {
      const response = await fetch("/api/session/google-challenge", {
        method: "POST",
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        nonce?: string;
        error?: string;
      };
      if (!response.ok || !data.nonce)
        throw new Error(
          data.error ?? "Google sign-in is unavailable. Use your phone number.",
        );
      if (!active) return;
      const identity = (
        window as Window & {
          google?: { accounts?: { id?: GoogleIdentity } };
        }
      ).google?.accounts?.id;
      if (!identity)
        throw new Error(
          "Google could not load. Use your phone number or reload the page.",
        );
      identity.initialize({
        client_id: clientId!,
        nonce: data.nonce,
        auto_select: false,
        ux_mode: "popup",
        callback: ({ credential }) => {
          void signIn(credential);
        },
      });
      let renderedWidth = 0;
      const render = () => {
        const width = Math.max(
          200,
          Math.min(400, Math.floor(element.clientWidth)),
        );
        // Google's iframe changes height while loading; only width changes
        // require rendering again, otherwise the iframe would be recreated.
        if (width === renderedWidth) return;
        renderedWidth = width;
        element.replaceChildren();
        identity.renderButton(element, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width,
        });
      };
      render();
      observer = new ResizeObserver(render);
      observer.observe(element);
      setPhase("ready");
    }
    let observer: ResizeObserver | undefined;
    void prepare().catch((failure: unknown) => {
      if (active) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Google sign-in is unavailable.",
        );
        setPhase("error");
      }
    });
    return () => {
      active = false;
      controller.abort();
      observer?.disconnect();
    };
  }, [scriptReady, clientId, attempt]);

  return (
    <div className="google-sign-in">
      {clientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() => {
            setError(
              "Google could not load. Use your phone number or reload the page.",
            );
            setPhase("error");
          }}
        />
      )}
      <div
        ref={container}
        className="google-sign-in-button"
        inert={disabled || phase !== "ready"}
        hidden={!clientId || phase === "error"}
      />
      {(!clientId || phase === "loading") && (
        <Button disabled>
          {clientId ? "Loading Google sign-in…" : "Sign in with Google"}
        </Button>
      )}
      {phase === "signing-in" && <p role="status">Signing in with Google…</p>}
      {!clientId && (
        <p className="fine-print">
          Google sign-in is not configured yet. Use your phone number.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {phase === "error" && scriptReady && (
        <Button
          disabled={disabled}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try Google again
        </Button>
      )}
    </div>
  );
}
