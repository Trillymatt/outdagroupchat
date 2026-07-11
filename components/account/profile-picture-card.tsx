"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { AvatarUploadField } from "@/components/account/avatar-upload-field";

export function ProfilePictureCard({
  userId,
  name,
  color,
  initialAvatarUrl,
}: {
  userId: string;
  name: string;
  color?: string;
  initialAvatarUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  async function save(url: string) {
    setAvatarUrl(url);
    await createClient().from("profiles").update({ avatar_url: url }).eq("id", userId);
  }

  return (
    <Card className="flex items-center gap-4">
      <AvatarUploadField userId={userId} name={name} color={color} currentUrl={avatarUrl} onChange={save} />
      <div>
        <h2 className="font-semibold text-ink">Profile picture</h2>
        <p className="text-sm text-ink-soft">Shown to other trip members. Hover the circle to change it.</p>
      </div>
    </Card>
  );
}
