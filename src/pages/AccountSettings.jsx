import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Lock, Loader2, LogOut, Monitor, ShieldCheck } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { usePrincipal } from "@/auth/PrincipalContext";
import { useLogout } from "@/auth/useLogout";
import { queryKeys } from "@/api/queryKeys";
import { toUserMessage } from "@/api/problemDetails";
import * as notificationService from "@/services/notificationService";
import { changePasswordSchema } from "@/features/auth/schemas";
import {
  useChangePassword,
  useSessions,
  useRevokeSession,
  applyServerErrors,
} from "@/features/auth/hooks";

/**
 * Account settings, wired to the real API:
 *  - identity from `GET /auth/me`
 *  - notification preferences from `GET/PUT /notifications/preferences`
 *  - password from `POST /auth/change-password`
 *  - sessions from `GET /auth/sessions` + `DELETE /auth/sessions/{id}`
 *
 * Editable client profile fields (phone, city) arrive with the client-profile
 * endpoint in Stage 4 — they are not shown as fake inputs here.
 */

const inputCls =
  "bg-deep-black/60 border-white/[0.08] text-ivory placeholder:text-muted-grey/60 focus:border-rose-gold/50";

function Row({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="w-4 h-4 text-rose-gold/70 mt-0.5 shrink-0" strokeWidth={1.2} />
        <div className="min-w-0">
          <p className="font-body text-sm text-ivory">{title}</p>
          {subtitle && <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NotificationPreferences() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: ({ signal }) => notificationService.getPreferences(signal),
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: notificationService.updatePreferences,
    onSuccess: (_r, prefs) => {
      queryClient.setQueryData(queryKeys.notifications.preferences(), prefs);
    },
    onError: (e) => toast({ title: "Couldn't save", description: toUserMessage(e), variant: "destructive" }),
  });

  if (isPending) {
    return <p className="mt-3 font-body text-[0.65rem] text-muted-grey">Loading preferences…</p>;
  }
  if (isError) {
    return <p className="mt-3 font-body text-[0.65rem] text-destructive">{toUserMessage(error)}</p>;
  }

  const toggle = (key) => update.mutate({ ...data, [key]: !data[key] });

  return (
    <div className="mt-2">
      <Row icon={Bell} title="Email" subtitle="Inquiry, proposal and booking updates by email">
        <Switch checked={data.emailEnabled} onCheckedChange={() => toggle("emailEnabled")} />
      </Row>
      <Row icon={Bell} title="SMS" subtitle="Time-critical updates by text message">
        <Switch checked={data.smsEnabled} onCheckedChange={() => toggle("smsEnabled")} />
      </Row>
      <Row icon={Bell} title="Push" subtitle="Alerts on this device">
        <Switch checked={data.pushEnabled} onCheckedChange={() => toggle("pushEnabled")} />
      </Row>
      <Row icon={Bell} title="Seasonal notices" subtitle="Agency announcements and events">
        <Switch checked={data.marketingEmails} onCheckedChange={() => toggle("marketingEmails")} />
      </Row>
    </div>
  );
}

function ChangePasswordForm({ onDone }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const changePassword = useChangePassword();

  const onSubmit = async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({ title: "Password updated" });
      onDone();
    } catch (e) {
      applyServerErrors(e, setError);
    }
  };

  const busy = isSubmitting || changePassword.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3" noValidate>
      {errors.root && (
        <p role="alert" className="font-body text-[0.65rem] text-destructive">
          {errors.root.message}
        </p>
      )}
      {[
        { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
        { name: "newPassword", label: "New password", autoComplete: "new-password" },
        { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
      ].map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">{f.label}</Label>
          <Input type="password" autoComplete={f.autoComplete} className={inputCls} {...register(f.name)} />
          {errors[f.name] && (
            <p className="font-body text-[0.65rem] text-destructive">{errors[f.name].message}</p>
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-rose-gold text-noir font-body uppercase text-[0.6rem] tracking-luxe px-4 py-2.5 rounded-sm disabled:opacity-60"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          Update password
        </button>
        <button
          type="button"
          onClick={onDone}
          className="font-body uppercase text-[0.6rem] tracking-luxe px-4 py-2.5 text-muted-grey hover:text-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ActiveSessions() {
  const { data, isPending, isError, error } = useSessions();
  const revoke = useRevokeSession();
  const logout = useLogout();

  if (isPending) {
    return <p className="mt-3 font-body text-[0.65rem] text-muted-grey">Loading sessions…</p>;
  }
  if (isError) {
    return <p className="mt-3 font-body text-[0.65rem] text-destructive">{toUserMessage(error)}</p>;
  }

  return (
    <div className="mt-2">
      {data.map((session) => (
        <Row
          key={session.id}
          icon={Monitor}
          title={session.deviceDescription || "Unknown device"}
          subtitle={`${session.isCurrent ? "This device · " : ""}Last active ${new Date(
            session.lastSeenAtUtc
          ).toLocaleString()}`}
        >
          {session.isCurrent ? (
            <span className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80">Current</span>
          ) : (
            <button
              onClick={() => revoke.mutate(session.id)}
              disabled={revoke.isPending}
              className="font-body text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory disabled:opacity-50"
            >
              Revoke
            </button>
          )}
        </Row>
      ))}
      <div className="pt-4">
        <button
          onClick={() => logout({ allDevices: true })}
          className="inline-flex items-center gap-2 font-body text-[0.6rem] tracking-luxe uppercase text-destructive hover:opacity-80"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out on all devices
        </button>
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const { principal } = usePrincipal();
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Your identity, notification preferences and security."
      />
      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <Card className="p-4">
          <Eyebrow>Profile</Eyebrow>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Name</Label>
              <Input value={principal.displayName ?? ""} readOnly className={inputCls} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Email</Label>
              <Input value={principal.email ?? ""} readOnly className={inputCls} />
            </div>
          </div>
          <p className="mt-3 font-body text-[0.65rem] text-muted-grey">
            Contact your Lustra representative to change your registered name or email.
          </p>
        </Card>

        <Card className="p-4">
          <Eyebrow>Notifications</Eyebrow>
          <NotificationPreferences />
        </Card>

        <Card className="p-4">
          <Eyebrow>Security</Eyebrow>
          <div className="mt-2">
            <Row icon={Lock} title="Password" subtitle="Change the password for this account">
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="text-[0.6rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold font-body"
                >
                  Update
                </button>
              )}
            </Row>
            {changingPassword && <ChangePasswordForm onDone={() => setChangingPassword(false)} />}
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Active sessions</Eyebrow>
          <div className="mt-1 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-gold/70" strokeWidth={1.2} />
            <p className="font-body text-[0.65rem] text-muted-grey">
              Revoking a session signs that device out immediately.
            </p>
          </div>
          <ActiveSessions />
        </Card>
      </div>
    </div>
  );
}
