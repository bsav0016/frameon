import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

import { db } from '../firebase';
import { orderSchema, sellerReviewSchema, type Order, type SellerReview } from '../models';
import { parseSnap, parseSnaps } from './parse';

export async function listOrders(role: 'buyer' | 'seller', uid: string): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, 'orders'), where(role === 'buyer' ? 'buyerUid' : 'sellerUid', '==', uid), orderBy('createdAt', 'desc'), limit(50)));
  return parseSnaps(orderSchema, snap.docs, 'id');
}

const reviewId = (sellerUid: string, raterUid: string) => `${sellerUid}_${raterUid}`;

export async function getMyReview(sellerUid: string, raterUid: string): Promise<SellerReview | null> {
  return parseSnap(sellerReviewSchema, await getDoc(doc(db, 'sellerReviews', reviewId(sellerUid, raterUid))), 'id');
}

export async function listSellerReviews(sellerUid: string): Promise<SellerReview[]> {
  const snap = await getDocs(query(collection(db, 'sellerReviews'), where('sellerUid', '==', sellerUid), orderBy('updatedAt', 'desc'), limit(50)));
  return parseSnaps(sellerReviewSchema, snap.docs, 'id');
}

/** Only buyers can review (rules check the purchase marker the webhook writes). */
export async function saveReview(args: { sellerUid: string; raterUid: string; raterUsername: string; stars: number; comment: string; existing: boolean }) {
  const ref = doc(db, 'sellerReviews', reviewId(args.sellerUid, args.raterUid));
  const comment = args.comment.trim();
  if (args.existing) {
    await updateDoc(ref, { stars: args.stars, comment, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      sellerUid: args.sellerUid,
      raterUid: args.raterUid,
      raterUsername: args.raterUsername,
      stars: args.stars,
      comment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
