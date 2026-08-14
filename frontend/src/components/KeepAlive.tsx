"use client";

import { ReactNode, useEffect, useState } from "react";

/**
 * Mount children the first time `active` becomes true, then keep them mounted
 * and hide when inactive. Prevents remount/refetch when switching dashboard tabs.
 */
export function KeepAlive({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [seen, setSeen] = useState(active);

  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);

  if (!seen) return null;

  return (
    <div
      className={[className, active ? null : "hidden"].filter(Boolean).join(" ") || undefined}
      hidden={!active}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
