import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-center min-h-[60vh] flex-col gap-4 text-center">
      <h1 className="font-display text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Không tìm thấy trang bạn yêu cầu.</p>
      <Link href="/" className="text-brand underline underline-offset-4">
        Về trang chủ
      </Link>
    </div>
  );
}
