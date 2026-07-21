import { z } from "zod";

/**
 * Client-side auth form schemas. These mirror the backend's validation rules so
 * the user gets immediate feedback, but they are NOT the authority — the server
 * revalidates everything and its field errors are mapped back onto the controls.
 */

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

/**
 * Presence only — the composition rules deliberately do NOT live here.
 *
 * They are fetched from `GET /public/password-policy`, which reads the live
 * Identity options, and are shown by `PasswordField` as a live checklist. A
 * second copy in this file would be a policy that eventually disagrees with the
 * one that actually rejects the password, and the user is who would find out.
 * A zod schema is evaluated synchronously at module scope and cannot consult the
 * fetched policy, so it asserts only that something was typed; the checklist
 * guides, and the server decides.
 */
const password = z.string().min(1, "Password is required");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Enter your name").max(80, "That name is too long"),
    email,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
    // Adults-only platform — the backend rejects a false declaration.
    isAdultDeclaration: z.literal(true, {
      errorMap: () => ({ message: "You must confirm you are 18 or older" }),
    }),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms of Service" }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Privacy Policy" }),
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email,
    token: z.string().min(1, "This reset link is invalid or incomplete"),
    newPassword: password,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
