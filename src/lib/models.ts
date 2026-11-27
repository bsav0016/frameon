import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// Firestore documents are parsed through these schemas so bad or legacy data fails loudly in one place
// instead of crashing a screen. `createdAt` is null on the client while a serverTimestamp() write is pending.
const timestamp = z.preprocess((v) => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
}, z.date());
// For fields that only exist once something has happened: missing stays null instead of becoming "now".
const optionalTimestamp = z.preprocess((v) => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : null), z.date().nullable());

export const profileSchema = z.object({
  username: z.string(),
  name: z.string().default(''),
  bio: z.string().default(''),
  photoURL: z.string().nullable().default(null),
  sellerRatingSum: z.number().default(0),
  sellerRatingCount: z.number().default(0),
});
export type Profile = z.infer<typeof profileSchema> & { uid: string };

export const postSchema = z.object({
  ownerUid: z.string(),
  ownerUsername: z.string(),
  caption: z.string().default(''),
  imagePath: z.string(),
  imageURL: z.string(),
  priceCents: z.number().int().default(0),
  quantity: z.number().int().default(0),
  createdAt: timestamp,
  ratingSum: z.number().default(0),
  ratingCount: z.number().int().default(0),
  commentCount: z.number().int().default(0),
  // Set by moderators only. Documents without the field (and unknown values) count as active.
  status: z.enum(['active', 'hidden']).catch('active'),
});
export type Post = z.infer<typeof postSchema> & { id: string };

export const commentSchema = z.object({
  authorUid: z.string(),
  username: z.string(),
  text: z.string(),
  createdAt: timestamp,
  status: z.enum(['active', 'hidden']).catch('active'),
});
export type Comment = z.infer<typeof commentSchema> & { id: string };

export const ratingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  username: z.string(),
  updatedAt: timestamp,
});
export type Rating = z.infer<typeof ratingSchema> & { uid: string };

export const sellerReviewSchema = z.object({
  sellerUid: z.string(),
  raterUid: z.string(),
  raterUsername: z.string(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().default(''),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type SellerReview = z.infer<typeof sellerReviewSchema> & { id: string };

export const addressSchema = z.object({
  name: z.string(),
  line1: z.string(),
  line2: z.string().default(''),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.enum(['US', 'CA']),
});
export type Address = z.infer<typeof addressSchema>;

export const ORDER_STATUSES = ['paid', 'shipped', 'delivered', 'refunded', 'disputed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Keep in step with functions/src/orderLogic.ts, which owns the transitions. Orders are written only by Cloud Functions.
export const orderSchema = z.object({
  postId: z.string(),
  postImageURL: z.string(),
  buyerUid: z.string(),
  buyerUsername: z.string(),
  sellerUid: z.string(),
  amountCents: z.number().int(),
  status: z.enum(ORDER_STATUSES),
  shippingAddress: addressSchema,
  carrier: z.string().nullable().default(null),
  trackingNumber: z.string().nullable().default(null),
  shippedAt: optionalTimestamp,
  deliveredAt: optionalTimestamp,
  createdAt: timestamp,
});
export type Order = z.infer<typeof orderSchema> & { id: string };

/** Every notification type this build can show. Keep in step with functions/src/contract.ts (see compat/app-contract.json). */
export const NOTIFICATION_TYPES = ['rating', 'comment', 'follow', 'purchase', 'removal', 'order_refunded', 'order_disputed', 'order_shipped', 'order_delivered'] as const;

export const notificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  // For removal notices: what was removed. Other notifications leave it out.
  targetType: z.enum(['post', 'comment', 'avatar']).default('post'),
  fromUid: z.string(),
  fromUsername: z.string(),
  fromPhotoURL: z.string().nullable().default(null),
  postId: z.string().nullable().default(null),
  postImageURL: z.string().nullable().default(null),
  stars: z.number().nullable().default(null),
  orderId: z.string().nullable().default(null),
  read: z.boolean().default(false),
  createdAt: timestamp,
});
export type AppNotification = z.infer<typeof notificationSchema> & { id: string };

export const REPORT_REASONS = ['spam', 'inappropriate', 'counterfeit', 'harassment', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTarget = 'post' | 'comment' | 'user';
