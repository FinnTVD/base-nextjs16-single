"use client"; // Error boundary phải là Client Component

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: gắn logger (Sentry…) ở đây
    console.error(error);
  }, [error]);

  return (
    <div className="flex-center min-h-[60vh] flex-col gap-4 text-center">
      <h2 className="text-xl font-semibold">Đã có lỗi xảy ra</h2>
      <button
        onClick={reset}
        className="rounded-md border px-4 py-2 hover:bg-accent"
      >
        Thử lại
      </button>
    </div>
  );
}
