import React from "react";

/**
 * Manual structured-address entry. A controlled component over a StructuredAddressInput.
 *
 * This is the shared manual address form. `AddressAutocomplete` wraps it: a Google Places
 * search sits on top and fills these fields (marking the address verified), while the manual
 * detail fields (line 2 / building / unit / access instructions) always remain separately
 * editable and are never overwritten by a place selection.
 *
 * `variant` controls how much is shown:
 *  - "full"    — every field (the manual/legacy fallback, and the "edit manually" expansion).
 *  - "details" — only the fields Google never fills: line 2, building, unit, access. Used
 *                alongside a verified Google selection so those stay editable.
 *
 * Inputs inherit the app's ≥16px mobile sizing, so focusing one never triggers an iOS zoom.
 *
 * @param {{
 *   value: object,
 *   onChange: (field: string, value: string) => void,
 *   errors?: Record<string, string>,
 *   idPrefix?: string,
 *   variant?: "full" | "details",
 * }} props
 */
const inputClass =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory placeholder:text-muted-grey/70 focus:outline-none focus:border-rose-gold/50";

function Row({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
        {label}
      </label>
      {children}
      {error && (
        <p className="font-body text-meta text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AddressFields({ value, onChange, errors = {}, idPrefix = "addr", variant = "full" }) {
  const set = (field) => (event) => onChange(field, event.target.value);
  const id = (field) => `${idPrefix}-${field}`;
  const full = variant !== "details";

  return (
    <div className="space-y-3">
      {full && (
        <>
          <Field label="Address line 1" htmlFor={id("addressLine1")} error={errors.addressLine1}>
            <input id={id("addressLine1")} className={inputClass} value={value.addressLine1 ?? ""} onChange={set("addressLine1")} placeholder="Street number and name" />
          </Field>

          <Row>
            <Field label="Suburb" htmlFor={id("suburb")}>
              <input id={id("suburb")} className={inputClass} value={value.suburb ?? ""} onChange={set("suburb")} />
            </Field>
            <Field label="City" htmlFor={id("city")}>
              <input id={id("city")} className={inputClass} value={value.city ?? ""} onChange={set("city")} />
            </Field>
          </Row>

          <Row>
            <Field label="Province" htmlFor={id("province")}>
              <input id={id("province")} className={inputClass} value={value.province ?? ""} onChange={set("province")} />
            </Field>
            <Field label="Postal code" htmlFor={id("postalCode")}>
              <input id={id("postalCode")} className={inputClass} value={value.postalCode ?? ""} onChange={set("postalCode")} />
            </Field>
          </Row>

          <Row>
            <Field label="Country" htmlFor={id("countryCode")} error={errors.countryCode}>
              <input id={id("countryCode")} className={inputClass} value={value.countryCode ?? ""} onChange={set("countryCode")} maxLength={2} placeholder="ZA" />
            </Field>
            <div />
          </Row>
        </>
      )}

      {/* Manual detail — always separately editable, never overwritten by a place selection. */}
      <Field label="Address line 2" htmlFor={id("addressLine2")}>
        <input id={id("addressLine2")} className={inputClass} value={value.addressLine2 ?? ""} onChange={set("addressLine2")} placeholder="Optional" />
      </Field>

      <Row>
        <Field label="Building / complex" htmlFor={id("buildingName")}>
          <input id={id("buildingName")} className={inputClass} value={value.buildingName ?? ""} onChange={set("buildingName")} />
        </Field>
        <Field label="Unit / apartment" htmlFor={id("unitNumber")}>
          <input id={id("unitNumber")} className={inputClass} value={value.unitNumber ?? ""} onChange={set("unitNumber")} />
        </Field>
      </Row>

      <Field label="Access instructions" htmlFor={id("accessInstructions")}>
        <textarea id={id("accessInstructions")} rows={2} className={inputClass} value={value.accessInstructions ?? ""} onChange={set("accessInstructions")} placeholder="Gate code, entrance, parking — private" />
      </Field>

      {(errors.coordinates || errors.address) && (
        <p className="font-body text-meta text-error" role="alert">
          {errors.address || errors.coordinates}
        </p>
      )}
    </div>
  );
}
