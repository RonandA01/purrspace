"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

interface GifResult {
  id: string;
  url: string;      // downsized URL for storage
  preview: string;  // fixed_height_small for display
}

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGifs = async (q: string) => {
    if (!GIPHY_KEY) {
      setGifs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=12&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGifs((json.data ?? []).map((g: any) => ({
        id: g.id,
        url: g.images.downsized.url,
        preview: g.images.fixed_height_small.url,
      })));
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  // Trending on mount
  useEffect(() => { fetchGifs(""); }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute bottom-12 left-0 right-0 z-50 rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden"
    >
      {/* Search header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        <MagnifyingGlass size={13} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
        />
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close GIF picker"
        >
          <X size={14} />
        </button>
      </div>

      {/* GIF grid */}
      <div className="h-44 overflow-y-auto p-2">
        {!GIPHY_KEY ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Set NEXT_PUBLIC_GIPHY_API_KEY to enable GIFs 😿
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="h-5 w-5 rounded-full border-2 border-paw-pink border-t-transparent"
            />
          </div>
        ) : gifs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No GIFs found 😿</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="aspect-video rounded-xl overflow-hidden hover:ring-2 hover:ring-paw-pink/60 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.preview}
                  alt="GIF"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Giphy attribution */}
      <div className="flex items-center justify-end px-3 py-1.5 border-t border-border/40 bg-secondary/30">
        <span className="text-[10px] text-muted-foreground">Powered by GIPHY</span>
      </div>
    </motion.div>
  );
}
