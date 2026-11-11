// Shapes match the Firestore documents written by the original Swift app.
export interface User {
  username: string;
  email: string;
  stripeAccount: string;
  customerID: string;
  soldTo: string[];
}

export interface UserInfo {
  name: string;
  bio: string;
}

export interface Post {
  id: string;
  caption: string;
  postedDate: string;
  postURLString: string;
  likers: string[];
  ratings: number[];
  price: number;
  shippingPrice: number;
  quantity: number;
}

export interface FeedPost {
  post: Post;
  owner: string;
}

export interface Comment {
  username: string;
  comment: string;
  dateString: string;
  likers: string[];
}

export interface SellerComment {
  comment: string;
  commentDate: string;
  rating: number;
  username: string;
}

export interface Address {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const NotificationType = { rate: 1, comment: 2, follow: 3, buy: 4 } as const;

export interface FONotification {
  identifier: string;
  notificationType: number;
  profilePictureURL: string;
  username: string;
  dateString: string;
  isFollowing?: boolean | null;
  postID?: string | null;
  postURL?: string | null;
  rating?: number | null;
  price?: number | null;
  buyerEmail?: string | null;
  address?: Address | null;
}
