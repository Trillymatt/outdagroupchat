"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

// Session-level cache so re-renders and list reordering don't refetch previews
const previewCache = new Map<string, PreviewData | null>();

function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PlainLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-green-dark hover:underline"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function LinkPreview({
  url,
  variant = "full",
  fallbackLabel = "View",
  className,
}: {
  url: string;
  /** "full" stacks a large image above the text (lodging cards); "compact" is a small thumbnail row (itinerary/food cards). */
  variant?: "full" | "compact";
  fallbackLabel?: string;
  className?: string;
}) {
  // undefined = loading, null = no preview available (fall back to a plain link)
  const [data, setData] = useState<PreviewData | null | undefined>(() => previewCache.get(url));
  const [imageFailed, setImageFailed] = useState(false);
  const [prevUrl, setPrevUrl] = useState(url);

  if (prevUrl !== url) {
    setPrevUrl(url);
    setData(previewCache.get(url));
    setImageFailed(false);
  }

  useEffect(() => {
    if (previewCache.has(url)) return;
    let cancelled = false;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: PreviewData | null) => {
        const preview = json && (json.title || json.image) ? json : null;
        previewCache.set(url, preview);
        if (!cancelled) setData(preview);
      })
      .catch(() => {
        previewCache.set(url, null);
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (data === undefined) {
    return (
      <div
        className={cn(
          "animate-pulse overflow-hidden rounded-xl border border-line bg-ink/[0.03]",
          variant === "full" ? "space-y-2 p-3" : "flex items-center gap-2.5 p-2",
          className,
        )}
        aria-hidden
      >
        {variant === "full" ? (
          <>
            <div className="h-24 rounded-lg bg-ink/10" />
            <div className="h-3 w-2/3 rounded bg-ink/10" />
            <div className="h-2.5 w-1/3 rounded bg-ink/10" />
          </>
        ) : (
          <>
            <div className="h-11 w-11 shrink-0 rounded-lg bg-ink/10" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 rounded bg-ink/10" />
              <div className="h-2.5 w-1/3 rounded bg-ink/10" />
            </div>
          </>
        )}
      </div>
    );
  }

  if (data === null) return <PlainLink url={url} label={fallbackLabel} />;

  const domain = displayDomain(data.url);
  const showImage = data.image && !imageFailed;

  if (variant === "compact") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2.5 overflow-hidden rounded-xl border border-line bg-ink/[0.02] p-2 transition-colors hover:border-green/40 hover:bg-green/5",
          className,
        )}
      >
        {showImage && (
          // Preview images come from arbitrary external domains, so next/image remote allowlisting doesn't apply
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image!}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink">{data.title ?? domain}</p>
          <p className="flex items-center gap-1 text-[11px] text-ink-soft">
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{data.siteName ?? domain}</span>
          </p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-soft/50" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block overflow-hidden rounded-xl border border-line bg-ink/[0.02] transition-colors hover:border-green/40 hover:bg-green/5",
        className,
      )}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image!}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="aspect-[1.91/1] w-full object-cover"
        />
      )}
      <div className="space-y-0.5 p-2.5">
        {data.title && <p className="line-clamp-2 text-xs font-medium leading-snug text-ink">{data.title}</p>}
        {data.description && <p className="line-clamp-2 text-[11px] leading-snug text-ink-soft">{data.description}</p>}
        <p className="flex items-center gap-1 pt-0.5 text-[11px] text-ink-soft/80">
          <Link2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{data.siteName ? `${data.siteName} · ${domain}` : domain}</span>
        </p>
      </div>
    </a>
  );
}
