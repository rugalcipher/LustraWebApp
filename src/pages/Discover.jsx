import React from "react";
import ImmersiveTalentDiscovery from "@/components/lustra/immersive/ImmersiveTalentDiscovery";

/**
 * Client Discover — an immersive, one-person-at-a-time profile-story
 * experience. One talent is shown at a time as a swipeable seven-slide
 * story (intro, about, gallery, rates, availability, reviews, summary).
 * Horizontal gestures change talent; profile slides change via progress
 * taps, up/down controls, or keyboard. The full profile is visible inside
 * the story — no separate detail page is required.
 */
export default function Discover() {
  return <ImmersiveTalentDiscovery />;
}