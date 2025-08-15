import React from "react";

interface InfiniteScrollSentinelProps {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export default function InfiniteScrollSentinel({ sentinelRef }: InfiniteScrollSentinelProps) {
  return (
    <div
      ref={sentinelRef}
      className="infinite-sentinel"
      aria-hidden="true"
      style={{ height: 1 }}
    />
  );
}
