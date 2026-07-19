// Internal mock data for management / talent / admin portals. All fictional.

export const ACTIVE_INQUIRIES = [
  { id: "inq-101", client: "A. Laurent", talent: "Isabelle", engagement: "Private Dinner", city: "New York", date: "Jul 22", priority: "high", stage: "new" },
  { id: "inq-102", client: "M. DuPont", talent: "Camille", engagement: "Brand Event", city: "Paris", date: "Jul 28", priority: "medium", stage: "pending" },
  { id: "inq-103", client: "R. Halberd", talent: "Elena", engagement: "Gala Hosting", city: "London", date: "Aug 03", priority: "high", stage: "new" },
  { id: "inq-104", client: "S. Kowalski", talent: "Sofia", engagement: "Wine Tasting", city: "Milan", date: "Aug 09", priority: "low", stage: "pending" },
  { id: "inq-105", client: "J. Abrahams", talent: "Valentina", engagement: "Private Performance", city: "Rome", date: "Aug 15", priority: "medium", stage: "confirmed" },
];

export const PENDING_PROPOSALS = [
  { id: "prop-201", client: "A. Laurent", talent: "Isabelle", total: 2400, status: "Awaiting client", sent: "Jul 16" },
  { id: "prop-202", client: "M. DuPont", talent: "Camille", total: 5400, status: "Awaiting client", sent: "Jul 17" },
  { id: "prop-203", client: "R. Halberd", talent: "Elena", total: 6600, status: "Revision requested", sent: "Jul 14" },
];

export const URGENT_MESSAGES = [
  { id: "um-1", from: "A. Laurent", preview: "Could we move the dinner to Thursday instead?", time: "8m ago", unread: true },
  { id: "um-2", from: "Camille", preview: "I'll need a car arranged from CDG.", time: "32m ago", unread: true },
  { id: "um-3", from: "M. DuPont", preview: "Happy to proceed — send the proposal.", time: "1h ago", unread: false },
];

export const PIPELINE_STAGES = ["new", "pending", "confirmed", "declined"];

export const CLIENTS = [
  { id: "c1", name: "A. Laurent", email: "a.laurent@lustra.app", tier: "Private Member", bookings: 7, status: "Verified", lastActive: "Jul 18", notes: "Prefers French-speaking talent." },
  { id: "c2", name: "M. DuPont", email: "m.dupont@lustra.app", tier: "Private Member", bookings: 3, status: "Verified", lastActive: "Jul 17", notes: "Brand events, Paris-based." },
  { id: "c3", name: "R. Halberd", email: "r.halberd@lustra.app", tier: "Founding Member", bookings: 12, status: "Verified", lastActive: "Jul 18", notes: "Galas only. Discretion paramount." },
  { id: "c4", name: "S. Kowalski", email: "s.kowalski@lustra.app", tier: "Private Member", bookings: 2, status: "Pending review", lastActive: "Jul 12", notes: "New — referred by R. Halberd." },
  { id: "c5", name: "J. Abrahams", email: "j.abrahams@lustra.app", tier: "Private Member", bookings: 5, status: "Verified", lastActive: "Jul 16", notes: "Enjoys opera and private performances." },
];

export const TALENT_APPLICATIONS = [
  { id: "ta-1", name: "Clara Voss", city: "Vienna", category: "Performer", applied: "Jul 15", references: 2, status: "pending" },
  { id: "ta-2", name: "Naomi Reyes", city: "Madrid", category: "Brand Ambassador", applied: "Jul 14", references: 1, status: "pending" },
  { id: "ta-3", name: "Petra Lindqvist", city: "Stockholm", category: "Event Companion", applied: "Jul 11", references: 3, status: "review" },
];

export const INQUIRY_SUBMISSIONS = [
  { id: "is-1", client: "F. Moreau", detail: "Weekend escape, Amalfi", flagged: "Budget unclear", submitted: "Jul 17", status: "pending" },
  { id: "is-2", client: "T. Bianchi", detail: "Gala hosting, Milan", flagged: "Verification needed", submitted: "Jul 16", status: "pending" },
  { id: "is-3", client: "K. Adler", detail: "Private dinner, Geneva", flagged: null, submitted: "Jul 15", status: "cleared" },
];

// `visibility` (Public | VIPOnly) and `status` (approval) are independent axes —
// see src/domain/media.js. Management reviews both.
export const MEDIA_ITEMS = [
  { id: "med-1", talent: "Isabelle", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=70", category: "Portrait", status: "approved", visibility: "Public" },
  { id: "med-2", talent: "Isabelle", url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=70", category: "Editorial", status: "pending", visibility: "VIPOnly" },
  { id: "med-3", talent: "Camille", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=70", category: "Portrait", status: "approved", visibility: "Public" },
  { id: "med-4", talent: "Camille", url: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=70", category: "Lifestyle", status: "pending", visibility: "VIPOnly" },
  { id: "med-5", talent: "Sofia", url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=70", category: "Portrait", status: "pending", visibility: "Public" },
  { id: "med-6", talent: "Elena", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=70", category: "Portrait", status: "approved", visibility: "VIPOnly" },
];

export const UPCOMING_BOOKINGS = [
  { id: "b1", client: "A. Laurent", engagement: "Private Dinner", city: "New York", date: "Jul 22", time: "8:00 PM", rate: 2400 },
  { id: "b2", client: "M. DuPont", engagement: "Brand Event", city: "Paris", date: "Jul 28", time: "7:30 PM", rate: 5400 },
  { id: "b3", client: "J. Abrahams", engagement: "Private Performance", city: "Rome", date: "Aug 15", time: "9:00 PM", rate: 6000 },
];

export const CONFIRMED_BOOKINGS = [
  { id: "cb1", date: "2026-07-22", talent: "Isabelle", client: "A. Laurent", engagement: "Private Dinner", city: "New York" },
  { id: "cb2", date: "2026-07-25", talent: "Margaux", client: "T. Bianchi", engagement: "Weekend Escape", city: "Monaco" },
  { id: "cb3", date: "2026-07-28", talent: "Camille", client: "M. DuPont", engagement: "Brand Event", city: "Paris" },
  { id: "cb4", date: "2026-08-03", talent: "Elena", client: "R. Halberd", engagement: "Gala Hosting", city: "London" },
  { id: "cb5", date: "2026-08-09", talent: "Sofia", client: "S. Kowalski", engagement: "Wine Tasting", city: "Milan" },
  { id: "cb6", date: "2026-08-15", talent: "Valentina", client: "J. Abrahams", engagement: "Private Performance", city: "Rome" },
];

export const ANALYTICS = {
  monthlyVolume: [
    { month: "Jan", bookings: 14, inquiries: 42 },
    { month: "Feb", bookings: 18, inquiries: 51 },
    { month: "Mar", bookings: 22, inquiries: 60 },
    { month: "Apr", bookings: 19, inquiries: 55 },
    { month: "May", bookings: 27, inquiries: 73 },
    { month: "Jun", bookings: 31, inquiries: 81 },
    { month: "Jul", bookings: 34, inquiries: 88 },
    { month: "Aug", bookings: 29, inquiries: 76 },
    { month: "Sep", bookings: 24, inquiries: 68 },
    { month: "Oct", bookings: 21, inquiries: 64 },
    { month: "Nov", bookings: 26, inquiries: 71 },
    { month: "Dec", bookings: 33, inquiries: 92 },
  ],
  conversion: [
    { stage: "Inquiry", count: 88 },
    { stage: "Qualified", count: 61 },
    { stage: "Proposal", count: 42 },
    { stage: "Confirmed", count: 34 },
  ],
  seasonalDemand: [
    { category: "Gala Hosting", q1: 6, q2: 9, q3: 12, q4: 18 },
    { category: "Private Dinner", q1: 14, q2: 16, q3: 19, q4: 17 },
    { category: "Brand Event", q1: 8, q2: 11, q3: 10, q4: 13 },
    { category: "Travel Host", q1: 5, q2: 14, q3: 18, q4: 7 },
    { category: "Private Perf.", q1: 4, q2: 6, q3: 8, q4: 12 },
  ],
};