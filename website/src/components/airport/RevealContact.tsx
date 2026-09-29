"use client";

import { useState } from "react";

/** "Show Phone Number" style pill that reveals the contact value (as a link) on click. */
export function RevealContact({ label, value, href }: { label: string; value: string; href: string }) {
  const [shown, setShown] = useState(false);
  if (shown) {
    return (
      <a href={href} className="text-[#113f9d] hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {value}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="rounded-full border border-[#1b9df5] bg-white px-4 py-0.5 text-sm text-[#1b9df5] transition hover:bg-[#1b9df5]/8"
    >
      {label}
    </button>
  );
}
