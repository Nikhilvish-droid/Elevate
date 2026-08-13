"use client";

import { useEffect, useState } from "react";
import {
  listCompanyNotifications,
  type CompanyNotification,
} from "@/lib/companyJobs";

export function CompanyInboxNote() {
  const [items, setItems] = useState<CompanyNotification[]>([]);

  useEffect(() => {
    listCompanyNotifications()
      .then((rows) =>
        setItems(
          rows
            .filter(
              (row) =>
                !row.is_read &&
                (row.notification_type === "offer" ||
                  /offer/i.test(row.title || "")),
            )
            .slice(0, 5),
        ),
      )
      .catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <div className="mb-4 border border-line bg-elevated px-5 py-4">
      <p className="text-sm font-semibold">Offer updates</p>
      <p className="mt-0.5 text-xs text-muted">
        Candidates accepted or declined an offer.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((row) => (
          <li key={row.id}>
            <p className="text-sm font-medium">{row.title}</p>
            <p className="text-xs text-muted">{row.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}