export interface UserProfile {
  uid: string;
  displayName?: string;
  phoneNumber: string;
  photoURL?: string;
  userType: 'buyer' | 'seller';
  createdAt: any;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  address?: string;
  rt?: string;
  rw?: string;
  whatsapp: string;
  price?: string;
  photoURL?: string;
  jamBuka?: string;
  jamTutup?: string;
  alamat?: string;
  linkMaps?: string;
  ownerId: string;
  rating: number;
  reviewCount: number;
  status: 'active' | 'archived';
  createdAt: any;
  updatedAt: any;
}

export interface Promo {
  id: string;
  businessId: string;
  content: string;
  photoURL?: string;
  expiresAt: any;
  createdAt: any;
}

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export type Category = 
  | 'Makanan & Minuman'
  | 'Jasa Tukang'
  | 'Fashion & Jahit'
  | 'Pulsa & Digital'
  | 'Kebutuhan Rumah'
  | 'Lainnya';

export const CATEGORIES: Category[] = [
  'Makanan & Minuman',
  'Jasa Tukang',
  'Fashion & Jahit',
  'Pulsa & Digital',
  'Kebutuhan Rumah',
  'Lainnya'
];
