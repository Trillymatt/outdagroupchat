import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 15;

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const cache = new Map<string, { data: LinkPreviewData | null; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8000;

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  // IPv6 literals — not worth the parsing risk, real link previews are for public hostnames
  if (host.includes(":") || host.startsWith("[")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127 || a === 169 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return true;
    }
  }
  return false;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const metaRegex = /<meta\s[^>]*>/gi;
  for (const [tag] of html.matchAll(metaRegex)) {
    const key = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content && !tags.has(key)) tags.set(key, decodeEntities(content));
  }
  return tags;
}

async function readBodyLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let html = "";
  let bytes = 0;
  while (bytes < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    // Everything we need lives in <head>; stop as soon as it has closed
    if (html.includes("</head>")) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

async function fetchPreview(target: URL): Promise<LinkPreviewData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Listing sites (Airbnb, Vrbo, OpenTable, …) reliably serve OG tags to link-unfurler agents
        "User-Agent": "Mozilla/5.0 (compatible; TandemBot/1.0; +https://tandem.app) facebookexternalhit/1.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;

    const html = await readBodyLimited(response);
    const meta = extractMetaTags(html);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];

    const title = meta.get("og:title") ?? meta.get("twitter:title") ?? (titleTag ? decodeEntities(titleTag) : null);
    const description = meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description") ?? null;
    let image = meta.get("og:image") ?? meta.get("og:image:url") ?? meta.get("twitter:image") ?? null;
    if (image) {
      try {
        const resolved = new URL(image, response.url || target);
        image = resolved.protocol === "https:" || resolved.protocol === "http:" ? resolved.href : null;
      } catch {
        image = null;
      }
    }

    if (!title && !image) return null;
    return {
      url: target.href,
      title,
      description,
      image,
      siteName: meta.get("og:site_name") ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if ((target.protocol !== "https:" && target.protocol !== "http:") || isBlockedHostname(target.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  // Previews are fetched server-side on behalf of the caller — keep this behind auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const cached = cache.get(target.href);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data ?? { url: target.href, title: null, description: null, image: null, siteName: null });
  }

  const data = await fetchPreview(target);
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(target.href, { data, expires: Date.now() + CACHE_TTL_MS });

  return NextResponse.json(data ?? { url: target.href, title: null, description: null, image: null, siteName: null }, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
