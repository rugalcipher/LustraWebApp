/**
 * The applicant detail record: its empty shape, its validation and its exact
 * wire form.
 *
 * Shared by the first application and by the changes-requested continuation so
 * the two can never disagree about what the API expects — particularly about
 * blank optional strings, which must be sent as `null` rather than `""`.
 *
 * `PUT /public/talent-applications/{id}` replaces the whole record: the request
 * body is the complete `TalentApplicationDetails`, not a patch. Anything omitted
 * is not "left alone", it is cleared. Both callers therefore always send the
 * full object built by `toDetails`.
 */

import { EMPTY_ADDRESS_INPUT, isAddressProvided, toAddressInput } from "@/domain/address";

export const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AED"];

export const EMPTY_DETAILS = {
  legalFirstName: "",
  legalMiddleNames: "",
  legalSurname: "",
  requestedDisplayName: "",
  email: "",
  cellphoneNumber: "",
  whatsAppNumber: "",
  instagram: "",
  additionalSocialUrl: "",
  cityFreeText: "",
  dateOfBirth: "",
  isAdultDeclared: false,
  shortBiography: "",
  requestedHourlyRate: "",
  currencyCode: "ZAR",
  publishOnApproval: true,
  consentToContact: false,
  // The applicant's optional PRIVATE base/working address. Never shown publicly.
  baseAddress: { ...EMPTY_ADDRESS_INPUT },
};

/** Age today from an ISO date. The server re-checks this at submission. */
export function ageFrom(iso) {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** Identity, contact and the two declarations. */
export function validateAbout(form) {
  const next = {};
  if (!form.legalFirstName.trim()) next.legalFirstName = "Required";
  if (!form.legalSurname.trim()) next.legalSurname = "Required";
  if (!form.email.trim()) next.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    next.email = "Enter a valid email address";
  if (!form.cellphoneNumber.trim()) next.cellphoneNumber = "Required";
  else if (!/^\+?[0-9\s()-]{7,}$/.test(form.cellphoneNumber.trim()))
    next.cellphoneNumber = "Enter a valid phone number";
  if (form.whatsAppNumber && !/^\+?[0-9\s()-]{7,}$/.test(form.whatsAppNumber.trim()))
    next.whatsAppNumber = "Enter a valid phone number";
  if (!form.dateOfBirth) next.dateOfBirth = "Required";
  else {
    const age = ageFrom(form.dateOfBirth);
    if (age !== null && age < 18) next.dateOfBirth = "You must be 18 or older to apply";
  }
  if (!form.isAdultDeclared) next.isAdultDeclared = "You must confirm you are 18 or older";
  if (!form.consentToContact) next.consentToContact = "We need your consent to contact you";
  return next;
}

/** The public-facing half: stage name, biography, links and optional rate. */
export function validateProfile(form) {
  const next = {};
  if (!form.requestedDisplayName.trim()) next.requestedDisplayName = "Required";
  if (!form.shortBiography.trim()) next.shortBiography = "Required";
  else if (form.shortBiography.trim().length < 40)
    next.shortBiography = "Tell us a little more — at least 40 characters";
  if (form.requestedHourlyRate && Number.isNaN(Number(form.requestedHourlyRate)))
    next.requestedHourlyRate = "Enter a number";
  if (form.instagram && /\s/.test(form.instagram.trim()))
    next.instagram = "Enter a handle or a full URL";
  if (form.additionalSocialUrl && !/^https?:\/\/\S+$/i.test(form.additionalSocialUrl.trim()))
    next.additionalSocialUrl = "Enter a full URL beginning with https://";
  return next;
}

/** The exact contract body. Blank optional strings are sent as null, not "". */
export function toDetails(form) {
  const blankToNull = (v) => (v && v.trim() ? v.trim() : null);
  return {
    legalFirstName: form.legalFirstName.trim(),
    legalMiddleNames: blankToNull(form.legalMiddleNames),
    legalSurname: form.legalSurname.trim(),
    requestedDisplayName: form.requestedDisplayName.trim(),
    email: form.email.trim(),
    cellphoneNumber: form.cellphoneNumber.trim(),
    whatsAppNumber: blankToNull(form.whatsAppNumber),
    instagram: blankToNull(form.instagram),
    additionalSocialUrl: blankToNull(form.additionalSocialUrl),
    cityId: null,
    cityFreeText: blankToNull(form.cityFreeText),
    dateOfBirth: form.dateOfBirth,
    isAdultDeclared: form.isAdultDeclared,
    shortBiography: form.shortBiography.trim(),
    requestedHourlyRate: form.requestedHourlyRate ? Number(form.requestedHourlyRate) : null,
    currencyCode: form.requestedHourlyRate ? form.currencyCode : null,
    publishOnApproval: form.publishOnApproval,
    consentToContact: form.consentToContact,
    // Optional private base address — sent only when the applicant provided a real locator.
    baseAddress:
      form.baseAddress && isAddressProvided(form.baseAddress) ? toAddressInput(form.baseAddress) : null,
  };
}
