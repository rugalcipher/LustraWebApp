import React, { useState } from "react";
import { User, Bell, Lock, Check } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/lib/roleStore";

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

export default function AccountSettings() {
  const { user } = useRole();
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    inquiries: true,
    proposals: true,
    messages: true,
    marketing: false,
  });
  const [twoFA, setTwoFA] = useState(false);

  const toggle = (key) => setNotifications((n) => ({ ...n, [key]: !n[key] }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Update your profile, notification preferences, and security details."
      />
      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <Card className="p-4">
          <Eyebrow>Profile</Eyebrow>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Full name</Label>
              <Input defaultValue={user.name} className={inputCls} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Email</Label>
              <Input type="email" defaultValue={user.email || "member@lustra.app"} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">Phone</Label>
              <Input placeholder="+1 (212) 555-0140" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey">City</Label>
              <Input placeholder="New York" className={inputCls} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Notifications</Eyebrow>
          <div className="mt-2">
            <Row icon={Bell} title="Inquiry updates" subtitle="When your inquiries change status">
              <Switch checked={notifications.inquiries} onCheckedChange={() => toggle("inquiries")} />
            </Row>
            <Row icon={Bell} title="Proposal responses" subtitle="Client replies to your proposals">
              <Switch checked={notifications.proposals} onCheckedChange={() => toggle("proposals")} />
            </Row>
            <Row icon={Bell} title="Messages" subtitle="New concierge messages">
              <Switch checked={notifications.messages} onCheckedChange={() => toggle("messages")} />
            </Row>
            <Row icon={Bell} title="Seasonal notices" subtitle="Agency announcements and events">
              <Switch checked={notifications.marketing} onCheckedChange={() => toggle("marketing")} />
            </Row>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Security</Eyebrow>
          <div className="mt-2">
            <Row icon={Lock} title="Change password" subtitle="Last updated 3 months ago">
              <button className="text-[0.6rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold font-body">
                Update
              </button>
            </Row>
            <Row icon={Lock} title="Two-factor authentication" subtitle="Add an extra layer of security">
              <Switch checked={twoFA} onCheckedChange={setTwoFA} />
            </Row>
            <Row icon={User} title="Active sessions" subtitle="2 devices currently signed in">
              <button className="text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory font-body">
                Manage
              </button>
            </Row>
          </div>
        </Card>

        <button
          onClick={save}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body uppercase text-[0.7rem] tracking-luxe py-3.5 rounded-sm hover:opacity-90 transition"
        >
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save changes"}
        </button>
      </div>
    </div>
  );
}