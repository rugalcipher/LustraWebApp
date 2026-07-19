import React from "react";
import { cn } from "@/lib/utils";
import { Watermark } from "@/lib/lustra/Brand";

/**
 * Generic full-screen slide wrapper — optional background image with
 * gradient, low-opacity Lustra watermark, and a relative content layer.
 * @param {{ image?: string; gradient?: boolean; children?: import("react").ReactNode; className?: string }} props
 */
export default function TalentStorySlide({ image, gradient = true, children, className }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-deep-black", className)}>
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}
      {image && gradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/45 to-noir/30" />
      )}
      <Watermark className="opacity-[0.03]" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}