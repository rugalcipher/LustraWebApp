/**
 * Talent-media API DTO — a PROPOSED wire shape for the future .NET media
 * endpoint (no backend implementation exists yet). Documents the expected
 * boundary so services map DTO → domain explicitly rather than passing raw
 * responses around.
 *
 * SECURITY: the real endpoint must server-filter by entitlement and return a
 * signed, expiring `url` ONLY to authorized callers; unauthorized callers must
 * receive no URL. The mapper never invents a URL.
 */

import type { TalentMediaItem, MediaVisibility, MediaApprovalStatus } from "@/domain/media";
import { MEDIA_VISIBILITY, MEDIA_APPROVAL_STATUS } from "@/domain/media";

export interface TalentMediaDto {
  id: string;
  talentId: string;
  /** Signed URL — present only when the server authorized this caller for it. */
  url?: string | null;
  visibility: string;
  approvalStatus: string;
  category?: string;
}

function toVisibility(v: string): MediaVisibility {
  return v === MEDIA_VISIBILITY.VipOnly ? "VipOnly" : "Public";
}

function toApproval(s: string): MediaApprovalStatus {
  if (s === MEDIA_APPROVAL_STATUS.Approved) return "Approved";
  if (s === MEDIA_APPROVAL_STATUS.Rejected) return "Rejected";
  return "Pending";
}

/** Explicit mapper: media DTO → canonical domain item. */
export function mapMediaDto(dto: TalentMediaDto): TalentMediaItem {
  return {
    id: dto.id,
    talentId: dto.talentId,
    url: dto.url ?? null,
    visibility: toVisibility(dto.visibility),
    approvalStatus: toApproval(dto.approvalStatus),
    category: dto.category,
  };
}
