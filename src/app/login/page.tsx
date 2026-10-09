import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import { previewEnabled } from "@/lib/server";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-brand">
        <Link href="/" className="brand">
          <BrandLogo />
          <strong>rakkyride</strong>
        </Link>
        <div>
          <span className="eyebrow">RAKKY RIDE ADMIN</span>
          <h1>
            A clear view.
            <br />A better journey.
          </h1>
          <p>
            Your workspace for trips, people and the details that keep Lagos
            moving.
          </p>
        </div>
        <span className="muted">Lagos, Nigeria · Staff access only</span>
      </section>
      <section className="login-panel">
        <div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p className="muted">
            Use the phone number linked to your staff account.
          </p>
          <LoginForm reason={reason} />
          {previewEnabled() && (
            <Link className="text-link" href="/admin">
              Open development preview →
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
