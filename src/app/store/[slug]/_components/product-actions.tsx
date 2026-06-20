"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * CLIENT ISLAND — phần tương tác duy nhất cần JS. Đặt ở lá, không kéo cả page
 * thành client. Modal nặng được dynamic-import (canonical: dynamic() TRONG client
 * component), chỉ tải khi bấm "Bảng size".
 */
const SizeGuideModal = dynamic(() => import("./size-guide-modal"), {
  loading: () => (
    <span className="text-sm text-muted-foreground">Đang tải…</span>
  ),
});

export default function ProductActions() {
  const [qty, setQty] = useState(1);
  const [openGuide, setOpenGuide] = useState(false);

  return (
    <div className="flex-y-center gap-4">
      <div className="flex-y-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
        >
          −
        </Button>
        <span className="w-8 text-center tabular-nums">{qty}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQty((q) => q + 1)}
        >
          +
        </Button>
      </div>

      <Button onClick={() => alert(`Đã thêm ${qty} sản phẩm vào giỏ`)}>
        Thêm vào giỏ
      </Button>

      <Button variant="link" onClick={() => setOpenGuide(true)}>
        Bảng size
      </Button>

      {openGuide && <SizeGuideModal onClose={() => setOpenGuide(false)} />}
    </div>
  );
}
