import { isApiMode, NotImplementedInApiModeError } from "@/services/apiClient";
import type { TalentMediaItem } from "@/domain/media";
import { MEDIA_APPROVAL_STATUS, MEDIA_VISIBILITY, normalizeMedia } from "@/domain/media";

/**
 * Typed talent-media service. Mock vs API adapters are EXPLICIT (see env). In
 * API mode the real .NET endpoint does not exist yet, so this throws rather
 * than silently serving mock data.
 *
 * SECURITY: VIP-only mock items use a clearly-labelled DUMMY placeholder SVG,
 * never a real/sensitive photograph. The real API must be the authorization
 * boundary; the client cache is never a security boundary.
 */

/** Clearly-labelled dummy artwork for VIP-only mock media. Not a real asset. */
export const VIP_DUMMY_PLACEHOLDER: string =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='1200'>
       <rect width='100%' height='100%' fill='#141013'/>
       <g fill='none' stroke='#B8876B' stroke-width='1.5' opacity='0.7'>
         <path d='M450 380 L560 490 L450 600 L340 490 Z'/>
       </g>
       <text x='50%' y='54%' fill='#B8876B' font-family='serif' font-size='34'
             text-anchor='middle' letter-spacing='6'>VIP</text>
       <text x='50%' y='60%' fill='#8A7A70' font-family='sans-serif' font-size='16'
             text-anchor='middle' letter-spacing='3'>DUMMY MEDIA</text>
     </svg>`
  );

interface TalentLike {
  id: string;
  gallery?: string[];
}

function buildMockGallery(talent: TalentLike): TalentMediaItem[] {
  const publicItems = (talent.gallery ?? []).map((url, i) =>
    normalizeMedia({
      id: `${talent.id}-pub-${i}`,
      talentId: talent.id,
      url,
      visibility: MEDIA_VISIBILITY.Public,
      approvalStatus: MEDIA_APPROVAL_STATUS.Approved,
      category: "Portrait",
    })
  );

  const vipItem = normalizeMedia({
    id: `${talent.id}-vip-0`,
    talentId: talent.id,
    url: VIP_DUMMY_PLACEHOLDER,
    visibility: MEDIA_VISIBILITY.VipOnly,
    approvalStatus: MEDIA_APPROVAL_STATUS.Approved,
    category: "Editorial",
  });

  const pendingItem = normalizeMedia({
    id: `${talent.id}-pending-0`,
    talentId: talent.id,
    url: VIP_DUMMY_PLACEHOLDER,
    visibility: MEDIA_VISIBILITY.VipOnly,
    approvalStatus: MEDIA_APPROVAL_STATUS.Pending,
    category: "Editorial",
  });

  return [...publicItems, vipItem, pendingItem];
}

/**
 * Fetch media items for a talent. In mock mode returns the full synthetic set
 * for the domain policy to resolve client-side; in API mode the real endpoint
 * (e.g. GET /api/v1/talent/{id}/media) must server-filter by entitlement and
 * return signed URLs — not available yet, so it fails loudly.
 */
export async function fetchTalentGallery({ talent }: { talent: TalentLike }): Promise<TalentMediaItem[]> {
  if (isApiMode) {
    throw new NotImplementedInApiModeError("mediaService.fetchTalentGallery");
  }
  return buildMockGallery(talent);
}
