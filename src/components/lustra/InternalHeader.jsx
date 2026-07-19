import React from "react";

/**
 * Page-title header for internal pages. Brand + primary navigation now live in
 * the surrounding shell (Talent/Management/Admin), so this is a lightweight,
 * FULL-WIDTH title block only — no duplicate brand bar and no narrow phone-
 * column cap. `back` is retained for API compatibility but no longer renders a
 * control (the shell owns navigation).
 *
 * @param {{
 *   eyebrow?: import("react").ReactNode;
 *   title?: import("react").ReactNode;
 *   subtitle?: import("react").ReactNode;
 *   back?: string;
 * }} props
 */
export default function InternalHeader({ eyebrow, title, subtitle }) {
  return (
    <header className="px-5 lg:px-8 pt-6 pb-4 w-full">
      {eyebrow && (
        <p className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="font-heading font-light text-3xl text-ivory leading-tight">{title}</h1>
      {subtitle && (
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </header>
  );
}
