import React from "react";
import Monogram from "@/lib/lustra/Monogram";
import { LustraVerticalLogo } from "@/components/lustra/BrandLogo";
import PublicHeader from "./PublicHeader";
import MarketingImage from "./MarketingImage";
import { MarketingIntro } from "./MarketingBlocks";
import type { PublicImage } from "./publicImages";

interface Props {
  eyebrow: string;
  title: string;
  image: PublicImage;
  footerNote?: string;
  children: React.ReactNode;
  /** When true, the layout does not render the intro (page owns its own top). */
  bareTop?: boolean;
}

/**
 * One continuous cinematic composition for every public marketing page.
 *
 * It is NOT a two-column grid. The image is an absolutely-positioned layer on
 * the left; a single full-width horizontal gradient fades it into noir and
 * extends UNDERNEATH the content, so there is no column boundary and the image
 * continues faintly behind the text. This layered split is preserved at EVERY
 * breakpoint (never stacked) — image left, content right, overlapping through
 * the centre. Per-page framing (object-position, image width) comes from the
 * image config; pages provide only eyebrow/title/content.
 */
export default function PublicMarketingLayout({ eyebrow, title, image, footerNote = "Private by Design", children, bareTop }: Props) {
  // NOTE: `overflow-x-clip` (not -hidden) contains the monogram watermark WITHOUT
  // creating a scroll container, which would break the sticky image panel.
  return (
    <div className="lustra-marble min-h-screen overflow-x-clip">
      <PublicHeader />

      <div
        className={`mkt-fade-scope relative min-h-[calc(100svh-4rem)]${image.mobileOverlap ? " mkt-overlap" : ""}`}
        style={
          {
            "--mkt-fade-d": image.widthDesktop,
            "--mkt-fade-m": image.widthMobile,
            // Optional per-page content inset (form-heavy pages widen the copy
            // column on small screens); undefined falls back to the CSS default.
            "--mkt-cpl-xs": image.contentLeftNarrow,
            "--mkt-cpl-m": image.contentLeftMobile,
            "--mkt-cpl-s": image.contentLeftSmall,
            "--mkt-cpl-d": image.contentLeftDesktop,
          } as React.CSSProperties
        }
      >
        {/* Tall image panel — drawn wider than the fade so its edge hides in noir.
            The image itself is viewport-tall and sticky: on long pages (e.g. the
            talent application) it travels with the scroll instead of stretching
            to the full document height, which would force an extreme, soft crop
            of a landscape master. Short pages are unaffected. */}
        <div className="mkt-img-layer absolute inset-y-0 left-0 z-0">
          <div className="sticky top-0 h-[100svh] overflow-hidden">
            <MarketingImage image={image} eager />
          </div>
        </div>

        {/* Horizontal dissolve into noir; continues underneath the content. */}
        <div className="mkt-blend absolute inset-0 z-10 pointer-events-none" />

        {/* Overlap pages only: a masked backdrop blur so the photograph reads as
            depth-of-field behind the form rather than competing with it. */}
        {image.mobileOverlap && <div className="mkt-scrim absolute inset-0 z-10 pointer-events-none" />}

        {/* Content layer — offset right, overlaps the image through the centre */}
        <div className="mkt-content relative z-20 min-h-[calc(100svh-4rem)] flex flex-col">
          {/* Large faint monogram watermark */}
          <div className="pointer-events-none absolute right-[-6%] top-1/2 -translate-y-1/2 z-0 opacity-[0.05] hidden md:block">
            <Monogram size={560} />
          </div>

          <div className="relative z-10 mkt-gutter-r py-9 sm:py-14 lg:py-20 flex-1">
            {!bareTop && <MarketingIntro eyebrow={eyebrow} title={title} />}
            <div className={bareTop ? "" : "mt-7 sm:mt-9 lg:mt-12"}>{children}</div>
          </div>

          {/* Discreet brand footer */}
          <div className="relative z-10 border-t border-white/[0.05] mkt-gutter-r py-6 sm:py-8">
            <div className="flex flex-col items-center">
              <LustraVerticalLogo className="h-10 w-auto opacity-80" />
              <p className="mt-2.5 font-body text-[0.5rem] tracking-luxe uppercase text-muted-grey">{footerNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
