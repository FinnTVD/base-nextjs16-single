"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Component "nặng" (kéo theo @radix dialog) — được lazy-load qua dynamic()
 * ở product-actions.tsx, CHỈ tải khi user mở. Đây là đúng pattern dynamic import.
 */
export default function SizeGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bảng size</DialogTitle>
          <DialogDescription>
            Nội dung bảng size (giả lập component nặng, chỉ tải khi mở).
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm">
          <li>S — 45–55kg</li>
          <li>M — 55–65kg</li>
          <li>L — 65–75kg</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
