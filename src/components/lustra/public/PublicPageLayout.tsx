import React from "react";
import Monogram from "@/lib/lustra/Monogram";
import { LustraVerticalLogo } from "@/components/lustra/BrandLogo";
import PublicHeader from "./PublicHeader";
import MarketingImage from "./MarketingImage";
import type { PublicImage } from "./publicImages";

interface Props {
  image: PublicImage;
  children: React.ReactNode;
  /** Small footer tagline under the closing logo. */
  footerNote?: string;
}

/**
 * Shared cinematic layout for the public marketing pages. Retains the public
 * website chrome (PublicHeader) and arranges every page as one luxury split
 * composition: a full-height image panel that dissolves into the page on desktop
 * (a fading top band on mobile), an offset content column on noir, a large faint
 * monogram watermark, and a discreet brand footer. Pages supply only content.
 */
export default function PublicPageLayout({ image, children, footerNote = "Private by Design" }: Props) {
  return (
    <div className="lustra-marble min-h-screen overflow-x-hidden">
      <PublicHeader />

      {/* Mobile: image as a fading top band */}
      <div className="lg:hidden relative h-[38vh] sm:h-[44vh]">
        <MarketingImage image={image} fade="bottom" eager />
      </div>

      <section className="relative overflow-hidden">
        {/* Desktop: image panel (extends under the content start, fading fully to
            noir first) so the split is seamless. */}
        <div className="hidden lg:block absolute inset-y-0 left-0 w-[54%] xl:w-[56%]">
          <MarketingImage image={image} fade="right" eager />
        </div>

        {/* Content column */}
        <div className="relative lg:ml-[46%] xl:ml-[48%] min-h-[50vh] lg:min-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden">
          {/* Large faint monogram watermark */}
          <div className="hidden lg:block pointer-events-none absolute right-[-7%] top-1/2 -translate-y-1/2 z-0 opacity-[0.05]">
            <Monogram size={620} />
          </div>

          <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 lg:py-20 flex-1">
            <div className="max-w-3xl">{children}</div>
          </div>

          {/* Discreet brand footer */}
          <div className="relative z-10 border-t border-white/[0.05] px-6 py-8 text-center">
            <LustraVerticalLogo className="h-11 w-auto mx-auto opacity-80" />
            <p className="mt-3 font-body text-[0.5rem] tracking-luxe uppercase text-muted-grey">{footerNote}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
