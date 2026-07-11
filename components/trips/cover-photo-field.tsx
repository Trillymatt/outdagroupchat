"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const BUCKET = "trip-covers";

/**
 * Upload-your-own override for a trip or leg's auto-suggested cover photo.
 * Purely handles the upload mechanics (storage path scoped by `folderId` so
 * RLS on the bucket can check trip membership) — the caller persists the
 * resulting public URL onto whichever row it belongs to.
 */
export function CoverPhotoField({
  folderId,
  currentUrl,
  onChange,
  size = "lg",
  alt = "",
}: {
  folderId: string;
  currentUrl: string | null;
  onChange: (url: string) => void;
  size?: "lg" | "sm";
  alt?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Images must be under 8 MB.");
      return;
    }
    setError("");
    setUploading(true);
    const supabase = createClient();
    try {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const path = `${folderId}/${crypto.randomUUID()}${ext.toLowerCase()}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={size === "lg" ? "space-y-1.5" : "shrink-0"}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-line bg-ink/[0.03]",
          size === "lg" ? "h-40 w-full" : "h-14 w-14",
        )}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Unsplash/Storage URLs, no next/image domain config needed
          <img src={currentUrl} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-soft/40">
            <ImagePlus className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change photo"
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-ink/55 font-medium text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-100",
            size === "lg" ? "text-xs" : "text-[9px]",
          )}
        >
          {uploading ? <Loader2 className={cn("animate-spin", size === "lg" ? "h-4 w-4" : "h-3 w-3")} /> : "Change"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
        />
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
