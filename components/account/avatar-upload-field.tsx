"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const BUCKET = "avatars";

export function AvatarUploadField({
  userId,
  name,
  color,
  currentUrl,
  onChange,
  size = 72,
}: {
  userId: string;
  name: string;
  color?: string;
  currentUrl: string | null;
  onChange: (url: string) => void;
  size?: number;
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
      const path = `${userId}/${crypto.randomUUID()}${ext.toLowerCase()}`;
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
    <div className="space-y-1.5">
      <div className={cn("group relative overflow-hidden rounded-full")} style={{ width: size, height: size }}>
        <Avatar name={name} color={color} avatarUrl={currentUrl} size={size} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile picture"
          className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/55 text-[11px] font-medium text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-100"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change"}
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
