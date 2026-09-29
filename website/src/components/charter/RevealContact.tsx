"use client";

import { useState } from "react";

/** Outlined pill that reveals a contact value (basic listings hide details until asked). */
export function RevealContact({ label, value, href, external }: { label: string; value: string; href: string; external?: boolean }) {
  const [shown, setShown] = useState(false);
  if (shown) {
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="break-all text-[#113f9d] hover:underline">
        {value}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="inline-flex h-[25px] items-center rounded-full border border-[#18a0f6] bg-white px-4 text-sm text-[#1b9df5] transition hover:bg-[#1b9df5]/8"
    >
      {label}
    </button>
  );
}
