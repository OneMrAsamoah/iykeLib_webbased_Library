import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  bookId?: number; // optional: when provided and src is empty, frontend will try /api/books/:id/thumbnail
  alt?: string;
  className?: string;
  fallback?: string;
  loading?: "lazy" | "eager";
};

// Simple in-memory cache to avoid re-fetching blobs repeatedly during a session.
const blobUrlCache = new Map<string, string>();

export default function Thumbnail({ src, bookId, alt = "thumbnail", className = "", fallback = "/placeholder.svg", loading = "lazy" }: Props) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => src ?? undefined);
  const fetchUrl = useMemo(() => {
    if (src) return undefined;
    if (typeof bookId === "number") return `/api/books/${bookId}/thumbnail`;
    return undefined;
  }, [src, bookId]);

  useEffect(() => {
    let mounted = true;
    setResolvedSrc(src ?? undefined);

    if (!src && fetchUrl) {
      // If cached, use it.
      const cached = blobUrlCache.get(fetchUrl);
      if (cached) {
        setResolvedSrc(cached);
        return;
      }

      // Fetch as blob and create object URL. Backend is not implemented yet; this gracefully fails.
      fetch(fetchUrl)
        .then((res) => {
          if (!res.ok) {
            // Log more details for debugging thumbnail failures
            console.error(`Thumbnail fetch failed for ${fetchUrl}: ${res.status} ${res.statusText}`);
            throw new Error(`Failed to fetch thumbnail: ${res.status}`);
          }
          return res.blob();
        })
        .then((blob) => {
          if (!mounted) return;
          const url = URL.createObjectURL(blob);
          blobUrlCache.set(fetchUrl, url);
          setResolvedSrc(url);
        })
        .catch((err) => {
          // leave undefined so img shows fallback via onError
          console.error('Error fetching thumbnail', fetchUrl, err?.message || err);
          if (mounted) setResolvedSrc(undefined);
        });
    }

    return () => {
      mounted = false;
    };
  }, [src, fetchUrl]);

  // If resolvedSrc is falsy, render img with fallback and rely on onError to show fallback
  const imgSrc = resolvedSrc ?? fallback;

  return (
    // Use img directly so browsers can handle caching, sizes and alt text.
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (target.src !== fallback) target.src = fallback;
      }}
    />
  );
}
