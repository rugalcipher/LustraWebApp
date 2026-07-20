import { z } from "zod";

/**
 * Client-side auth form schemas. These mirror the backend's validation rules so
 * the user gets immediate feedback, but they are NOT the authority — the server
 * revalidates everything and its field errors are mapped back onto the controls.
 */

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

/** Mirrors the backend Identity password policy. */
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^A-Za-z0-9]/, "Include at least one symbol");

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
