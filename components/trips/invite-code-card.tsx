"use client";

import { useState } from "react";
import { Copy, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INVITE_TITLE = "You’re invited to plan a trip";
const INVITE_TEXT = "Bring the plans out of the group chat — together in Tandem.";

export function InviteCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | "message" | null>(null);

  async function copy(value: string, kind: "code" | "link" | "message") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  function inviteLink() {
    return `${window.location.origin}/join/${code}`;
  }

  async function shareInvite() {
    const url = inviteLink();
    if (navigator.share) {
      try {
        await navigator.share({ title: INVITE_TITLE, text: INVITE_TEXT, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(`${INVITE_TITLE}\n${INVITE_TEXT}\n${url}`, "message");
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold text-ink">Invite people</h2>
      <p className="text-sm text-ink-soft">Share this with your group chat. The invite stays with them through sign in or account creation.</p>
      <div className="rounded-2xl border border-line bg-paper p-3.5">
        <p className="text-sm font-semibold text-ink">{INVITE_TITLE}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{INVITE_TEXT}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="flex-1 rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.3em]">
          {code}
        </span>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => copy(code, "code")}>
          <Copy className="h-3.5 w-3.5" />
          {copied === "code" ? "Copied!" : "Copy code"}
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1 truncate rounded-2xl border border-line bg-paper px-3.5 py-2.5 font-mono text-xs text-ink-soft">
          /join/{code}
        </span>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => copy(inviteLink(), "link")}>
          <Copy className="h-3.5 w-3.5" />
          {copied === "link" ? "Copied!" : "Copy link"}
        </Button>
      </div>
      <Button className="w-full" onClick={shareInvite}>
        <Send className="h-4 w-4" />
        {copied === "message" ? "Invite copied!" : "Share invite"}
      </Button>
      <p className="text-xs text-ink-soft/70">The link opens a clear invitation with options to sign in or create an account.</p>
    </Card>
  );
}
