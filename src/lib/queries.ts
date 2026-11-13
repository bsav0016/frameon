import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from './auth-context';
import { getProfile, getProfileStats } from './data/profiles';
import { getPost, listComments, listExplore, listFeed, listUserPosts, getMyRating } from './data/posts';
import { isFollowing, listBlocked, listFollowing } from './data/social';
import { listNotifications } from './data/notifications';
import { db } from './firebase';

/** The signed-in user's uid. Screens behind the auth guard can rely on it being set. */
export function useUid(): string {
  const { user } = useAuth();
  return user?.uid ?? '';
}

export const useProfile = (uid?: string) =>
  useQuery({ queryKey: ['profile', uid], queryFn: () => getProfile(uid!), enabled: !!uid, staleTime: 60_000 });

export const useProfileStats = (uid?: string) =>
  useQuery({ queryKey: ['stats', uid], queryFn: () => getProfileStats(uid!), enabled: !!uid });

/** Whether the current user finished Stripe onboarding (private user doc, server-written). */
export function useCanSell() {
  const uid = useUid();
  return useQuery({
    queryKey: ['canSell', uid],
    enabled: !!uid,
    queryFn: async () => (await getDoc(doc(db, 'users', uid))).data()?.chargesEnabled === true,
  });
}

export const useFollowing = () => {
  const uid = useUid();
  return useQuery({ queryKey: ['following', uid], queryFn: () => listFollowing(uid), enabled: !!uid });
};

export const useBlocked = () => {
  const uid = useUid();
  return useQuery({ queryKey: ['blocked', uid], queryFn: () => listBlocked(uid), enabled: !!uid });
};

export const useIsFollowing = (other: string) => {
  const uid = useUid();
  return useQuery({ queryKey: ['isFollowing', uid, other], queryFn: () => isFollowing(uid, other), enabled: !!uid && !!other });
};

export function useFeed() {
  const uid = useUid();
  const following = useFollowing();
  const blocked = useBlocked();
  const ready = !!uid && following.data !== undefined && blocked.data !== undefined;
  return useInfiniteQuery({
    queryKey: ['feed', uid],
    enabled: ready,
    initialPageParam: undefined as Date | undefined,
    queryFn: ({ pageParam }) => listFeed([uid, ...(following.data ?? [])], blocked.data ?? [], pageParam, uid),
    getNextPageParam: (last) => (last.length >= 20 ? last[last.length - 1].createdAt : undefined),
  });
}

export function useExplore() {
  const uid = useUid();
  const blocked = useBlocked();
  return useInfiniteQuery({
    queryKey: ['explore', uid],
    enabled: blocked.data !== undefined,
    initialPageParam: null as Awaited<ReturnType<typeof listExplore>>['cursor'],
    queryFn: ({ pageParam }) => listExplore(blocked.data ?? [], pageParam, uid),
    getNextPageParam: (last) => last.cursor ?? undefined,
  });
}

export function useUserPosts(ownerUid?: string) {
  const viewer = useUid();
  return useInfiniteQuery({
    queryKey: ['userPosts', ownerUid, viewer],
    enabled: !!ownerUid,
    initialPageParam: null as Awaited<ReturnType<typeof listUserPosts>>['cursor'],
    queryFn: ({ pageParam }) => listUserPosts(ownerUid!, pageParam, viewer),
    getNextPageParam: (last) => last.cursor ?? undefined,
  });
}

export const usePost = (id: string) => useQuery({ queryKey: ['post', id], queryFn: () => getPost(id), enabled: !!id });

export const useComments = (postId: string) => {
  const uid = useUid();
  const blocked = useBlocked();
  return useQuery({ queryKey: ['comments', postId], queryFn: () => listComments(postId, blocked.data ?? [], uid), enabled: !!postId });
};

export const useMyRating = (postId: string) => {
  const uid = useUid();
  return useQuery({ queryKey: ['myRating', postId, uid], queryFn: () => getMyRating(postId, uid), enabled: !!uid && !!postId });
};

export const useNotifications = () => {
  const uid = useUid();
  return useQuery({ queryKey: ['notifications', uid], queryFn: () => listNotifications(uid), enabled: !!uid });
};

/** Invalidates everything that shows a post list, e.g. after posting, deleting, following or blocking. */
export function useRefreshLists() {
  const qc = useQueryClient();
  return () => Promise.all(['feed', 'explore', 'userPosts', 'stats', 'following', 'blocked', 'isFollowing'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}
