import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="text-center">
        <p className="grad-text font-display text-5xl font-bold mb-3">404</p>
        <h1 className="text-text text-lg mb-2">That page isn't here.</h1>
        <p className="text-muted text-sm mb-6">
          The job or page you're looking for doesn't exist, or you don't have access to it.
        </p>
        <Link
          href="/"
          className="grad-bg text-bg font-medium rounded px-5 py-2.5 hover:opacity-90 transition-colors inline-block"
        >
          Back to Inbox
        </Link>
      </div>
    </div>
  );
}
