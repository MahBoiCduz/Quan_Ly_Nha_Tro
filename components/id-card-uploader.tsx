"use client";

import { useToast } from "@/components/toast";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function IdCardUploader({
  front, back, onFront, onBack,
}: {
  front: string;
  back: string;
  onFront: (url: string) => void;
  onBack: (url: string) => void;
}) {
  const toast = useToast();

  async function handle(file: File | undefined, set: (url: string) => void) {
    if (!file) return;
    try {
      const url = await uploadImage(file);
      set(url);
      toast.success("Đã tải ảnh lên");
    } catch {
      toast.error("Tải ảnh thất bại");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Ảnh CCCD mặt trước</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block text-sm text-muted"
          onChange={(e) => handle(e.target.files?.[0], onFront)}
        />
        {front && <img src={front} alt="mặt trước" className="mt-1 h-24 rounded border object-cover" />}
      </div>
      <div>
        <label className="label">Ảnh CCCD mặt sau</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block text-sm text-muted"
          onChange={(e) => handle(e.target.files?.[0], onBack)}
        />
        {back && <img src={back} alt="mặt sau" className="mt-1 h-24 rounded border object-cover" />}
      </div>
    </div>
  );
}
