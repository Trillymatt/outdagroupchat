"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function InviteCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [origin, setOrigin] = useState("");

  // Read the origin after mount so the server- and client-rendered HTML match.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copy(value: string, kind: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  const link = `${origin}/join/${code}`;

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-ink">Invite people</h2>
      <p className="text-sm text-ink-soft">Share this with your group chat — anyone with it can join.</p>
      <div className="flex items-center gap-2">
        <span className="flex-1 rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.3em]">
          {code}
        </span>
        <Button variant="secondary" onClick={() => copy(code, "code")}>
          {copied === "code" ? "Copied!" : "Copy code"}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-2xl border border-line bg-paper px-3.5 py-2.5 font-mono text-xs text-ink-soft">
          {origin ? link : `/join/${code}`}
        </span>
        <Button variant="secondary" onClick={() => copy(link, "link")}>
          {copied === "link" ? "Copied!" : "Copy link"}
        </Button>
      </div>
      <p className="text-xs text-ink-soft/70">The link joins them in one tap — no code to type.</p>
    </Card>
  );
}
