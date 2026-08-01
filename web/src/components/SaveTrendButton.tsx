"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSaved, toggleSaved } from "@/lib/saved-trends";

export function SaveTrendButton({
  trendId,
  size = "md",
}: {
  trendId: string;
  size?: "sm" | "md";
}) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(isSaved(trendId));
  }, [trendId]);

  return (
    <Button
      variant={saved ? "primary" : "secondary"}
      size={size}
      onClick={() => setSaved(toggleSaved(trendId))}
      suppressHydrationWarning
    >
      {mounted && saved ? (
        <>
          <BookmarkCheck className="size-4" /> Saved
        </>
      ) : (
        <>
          <Bookmark className="size-4" /> Save Trend
        </>
      )}
    </Button>
  );
}
