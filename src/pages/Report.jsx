import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { toUserMessage } from "@/api/problemDetails";
import { fileReport, REPORT_CATEGORIES } from "@/services/reportService";

/**
 * File a safety report.
 *
 * This page existed only as a link before: `TalentProfile` pointed at `/app/report` and
 * the route was never registered, so "Report profile" — a SAFETY control — 404'd. A
 * reporting path that silently fails is worse than none, because it makes someone believe
 * they have raised a concern when nothing was recorded.
 *
 * The subject is carried in the query string as a talent SLUG, which is already public.
 * Nothing sensitive travels in the URL.
 */
export default function Report() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subject = params.get("talent");

  const [category, setCategory] = useState("SafetyConcern");
  const [description, setDescription] = useState("");
  const [reportId, setReportId] = useState(null);

  const submit = useMutation({
    mutationFn: (input) => fileReport(input),
    // A report is not idempotent and duplicates create moderation noise; a retry is the
    // reporter's deliberate choice.
    retry: false,
    onSuccess: (result) => setReportId(result.reportId),
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    await submit.mutateAsync({
      // The profile is identified in the description rather than as a target id: the page
      // has a slug, not the user id the API keys `User` reports on, and inventing one
      // would file the report against the wrong record.
      targetType: "Profile",
      targetId: null,
      category,
      description: subject
        ? `Regarding profile "${subject}".\n\n${description.trim()}`
        : description.trim(),
    });
  };

  if (reportId) {
    return (
      <div className="px-5 pt-6 pb-10">
        <div className="mt-10 text-center">
          <div className="w-12 h-12 rounded-full border border-success/40 flex items-center justify-center mx-auto">
            <Check className="w-5 h-5 text-success" strokeWidth={1.4} />
          </div>
          <h1 className="font-heading font-light text-2xl text-ivory mt-5">Report received</h1>
          <p className="font-body text-sm text-muted-grey mt-3 leading-relaxed max-w-sm mx-auto">
            Lustra's safety team will review this. We may contact you if we need more detail.
            You will not be told who handled it or what action was taken about another
            person's account.
          </p>
          <LustraButton as={Link} to="/app/discover" variant="outline" size="sm" className="mt-7">
            Back to Discover
          </LustraButton>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
      </button>

      <div className="mt-4">
        <Eyebrow>Safety</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Report a concern</h1>
        {subject && (
          <p className="font-body text-sm text-muted-grey mt-2">
            About <span className="text-soft-ivory/85">{subject}</span>
          </p>
        )}
      </div>

      <div className="mt-5 flex gap-2.5 p-3.5 rounded-lg border border-warning/25 bg-warning/[0.03]">
        <ShieldAlert className="w-4 h-4 text-warning mt-0.5 shrink-0" strokeWidth={1.3} />
        <p className="font-body text-[0.7rem] text-soft-ivory/85 leading-relaxed">
          If you are in immediate danger, contact your local emergency services first.
          Lustra's team cannot provide an emergency response.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <p className="text-[0.6rem] tracking-luxe uppercase text-muted-grey">What happened?</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {REPORT_CATEGORIES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-[0.55rem] tracking-wide-luxe uppercase font-body transition",
                  category === option.value
                    ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                    : "border-white/10 text-muted-grey hover:text-soft-ivory"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[0.6rem] tracking-luxe uppercase text-muted-grey">Details</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={4000}
            required
            placeholder="Tell us what happened, including dates and anything else that would help us understand."
            className="w-full mt-2 bg-transparent border border-white/10 rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
          />
        </label>

        <p className="font-body text-[0.6rem] text-muted-grey leading-relaxed">
          Reports are read by Lustra's safety team only. The person you are reporting is not
          told who filed it.
        </p>

        {submit.isError && (
          <p className="font-body text-[0.7rem] text-error">{toUserMessage(submit.error)}</p>
        )}

        <LustraButton
          type="submit"
          className="w-full"
          disabled={description.trim().length < 10 || submit.isPending}
        >
          {submit.isPending ? "Sending…" : "Submit report"}
        </LustraButton>
      </form>
    </div>
  );
}
