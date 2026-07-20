import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import TalentStoryProgress from "./TalentStoryProgress";
import TalentIntroSlide from "./TalentIntroSlide";
import TalentAboutSlide from "./TalentAboutSlide";
import TalentGallerySlide from "./TalentGallerySlide";
import TalentRatesSlide from "./TalentRatesSlide";
import TalentAvailabilitySlide from "./TalentAvailabilitySlide";
import TalentReviewsSlide from "./TalentReviewsSlide";
import TalentSummarySlide from "./TalentSummarySlide";

/**
 * Renders the seven-slide profile story for a single talent. Handles
 * vertical slide transitions via AnimatePresence and the progress
 * indicator. Talent-level (horizontal) transitions are handled by the
 * parent ImmersiveTalentDiscovery.
 */
export default function TalentStory({
  talent,
  slideIndex,
  totalSlides,
  slideTitles,
  onSlideJump,
  saved,
  onToggleSave,
  onMessage,
  reduced,
}) {
  const slides = [
    <TalentIntroSlide
      key="intro"
      talent={talent}
      saved={saved}
      onToggleSave={onToggleSave}
      reduced={reduced}
    />,
    <TalentAboutSlide key="about" talent={talent} />,
    <TalentGallerySlide key="gallery" talent={talent} reduced={reduced} />,
    <TalentRatesSlide key="rates" talent={talent} />,
    <TalentAvailabilitySlide key="avail" talent={talent} />,
    <TalentReviewsSlide key="reviews" talent={talent} reduced={reduced} />,
    <TalentSummarySlide
      key="summary"
      talent={talent}
      saved={saved}
      onToggleSave={onToggleSave}
      onMessage={onMessage}
      reduced={reduced}
    />,
  ];

  return (
    <div className="absolute inset-0">
      <TalentStoryProgress
        current={slideIndex}
        total={totalSlides}
        titles={slideTitles}
        onJump={onSlideJump}
        reduced={reduced}
      />
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={slideIndex}
          initial={{ opacity: 0, y: reduced ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -18 }}
          transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {slides[slideIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}