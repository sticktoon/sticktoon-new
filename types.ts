
export interface Badge {
  id: string;
  name: string;
  price: number;
  category: Category;

  image: string;            // pin image (default)
  imageMagnetic?: string;  // magnetic image (optional)

  details: string;
  color: string;
  isFeatured?: boolean;
}


export interface CartItem extends Badge {
  quantity: number;
}

export interface User {
  name: string;
  email: string;
  address: string;
  phone: string;
}

export enum Category {
  MOODY = 'Moody',
  SPORTS = 'Sports',
  RELIGIOUS = 'Religious',
  ENTERTAINMENT = 'Entertainment',
  EVENTS = 'Events',
  ANIMAL = 'Animal',
  COUPLE = 'Couple',
  ANIME = 'Anime',
  CUSTOM = 'Custom'
}

export interface AppState {
  cart: CartItem[];
  user: User | null;
  selectedCategory: string | null;
}
