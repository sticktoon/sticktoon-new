
import { Badge, Category } from './types';

export const COLORS = {
  primary: '#4338CA', // Indigo Blue
  secondary: '#E0E7FF', // Indigo 100
  accent: '#06B6D4', // Electric Cyan
  bg: '#FFFDF5',
};

export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
export const CATEGORIES = [
  {
    id: 'moody',
    name: 'MOODY',
    count: 5,
    icon: 'smile',
    image: 'badge/mergemoody.png', // ✅ NEW
  },
  {
    id: 'sports',
    name: 'SPORTS',
    count: 5,
    icon: 'trophy',
    image: 'badge/mergesport.png',
  },
  {
    id: 'religious',
    name: 'RELIGIOUS',
    count: 5,
    icon: 'sparkles',
    image: 'badge/mergereligious.png',
  },
  // others...
  {
    id: 'entertainment',
    name: 'ENTERTAINMENT',
    count: 5,
    icon: 'sparkles',
    image: 'badge/mergeenter.png',
  },
  {
    id: 'events',
    name: 'EVENTS',
    count: 5,
    icon: 'sparkles',
    image: 'badge/mergeevent.png',
  },
  {
    id: 'animal',
    name: 'ANIMAL',
    count: 5,
    icon: 'sparkles',
    image: 'badge/mergeanimal.png',
  },
  {
    id: 'couple',
    name: 'COUPLE',
    count: 5,
    icon: 'sparkles',
    image: 'badge/mergecouple.png',
  },
  {
    id: 'anime',
    name: 'ANIME',
    count: 5,
    icon: 'sparkles',
    image: 'badge/mergeanime.png',
  },
];


export const BADGES: Badge[] = [
  // --- MOODY (Reordered: Angry Vibe is now FIRST) ---
  { 
    id: 'moody-5', 
    name: 'Joy Pop', 
    price: 49, 
    category: Category.MOODY, 
    image: '/badge/moody2.png', 
    details: 'Serious face only. Let them know you mean business.', 
    color: 'bg-transparent', 
    isFeatured: true 
  },
  //   { 
  //   id: 'moody-6', 
  //   name: 'Joy Pop', 
  //   price: 49, 
  //   category: Category.MOODY, 
  //   image: 'badge/flag.png', 
  //   details: 'Serious face only. Let them know you mean business.', 
  //   color: 'bg-transparent', 
  //   isFeatured: true 
  // },
   
  
  { id: 'moody-1', name: 'Crushin’', price: 49, category: Category.MOODY, image: '/badge/moody1.png', details: 'Spread pure joy.', color: 'bg-transparent' },
  { id: 'moody-2', name: 'OMG Mood', price: 49, category: Category.MOODY, image: '/badge/moody3.png', details: 'Feel the love.', color: 'bg-transparent' },
  { id: 'moody-3', name: 'Just Vibin’', price: 49, category: Category.MOODY, image: '/badge/moody4.png', details: 'Pure comedy gold.', color: 'bg-transparent',  },

  // { id: 'moody-4', name: 'SHOCKED VIBE', price: 49, category: Category.MOODY, image: '/badge/moody5.png', details: 'OMG moments only.', color: 'bg-transparent', isFeatured: true },

  // --- SPORTS ---
  { id: 'sports-1', name: 'Victory Kick', price: 49, category: Category.SPORTS, image: '/badge/sports4.png', details: 'The cricket spirit.', color: 'bg-transparent' },
 { id: 'sports-2', name: 'Slam Point', price: 49, category: Category.SPORTS, image: '/badge/sports3.png', details: 'For the football fanatics.', color: 'bg-transparent' },
{ id: 'sports-3', name: 'Strike Force', price: 49, category: Category.SPORTS, image: '/badge/sports1.png', details: 'Nothing but net.', color: 'bg-transparent', isFeatured: true},
{ id: 'sports-4', name: 'Power Play', price: 49, category: Category.SPORTS, image: '/badge/sports2.png', details: 'Game, set, match.', color: 'bg-transparent' },

  // { id: 'sports-5', name: 'ACTIVE VIBE', price: 49, category: Category.SPORTS, image: '/badge/sports4.png', details: 'Keep moving.', color: 'bg-transparent' },
  
  // --- RELIGIOUS ---
  { id: 'spiritual-1', name: 'Vighnaharta', price: 49, category: Category.RELIGIOUS, image: '/badge/R1.png', details: 'Find your peace.', color: 'bg-transparent'},
  { id: 'spiritual-2', name: 'Divine Shiva', price: 49, category: Category.RELIGIOUS, image: '/badge/R2.png', details: 'Sacred energy.', color: 'bg-transparent'  },
  { id: 'spiritual-3', name: 'Flute of Faith', price: 49, category: Category.RELIGIOUS, image: '/badge/R5.png', details: 'Universal love.', color: 'bg-transparent'},
  { id: 'spiritual-4', name: 'Sacred Strength', price: 49, category: Category.RELIGIOUS, image: '/badge/R4.png', details: 'Ancient symbols.', color: 'bg-transparent', isFeatured: true },
  // { id: 'spiritual-5', name: 'LIGHT VIBE', price: 49, category: Category.RELIGIOUS, image: '/badge/R5.png', details: 'Inner illumination.', color: 'bg-transparent' },
  
  // --- ENTERTAINMENT ---
  { id: 'ent-1', name: 'GAMER VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert2.png', details: 'Level up.', color: 'bg-transparent' , isFeatured: true},
  { id: 'ent-2', name: 'CINEMA VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/enter3.png', details: 'Movie magic.', color: 'bg-transparent' },
  { id: 'ent-3', name: 'DISCO VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert4.png', details: 'Music to ears.', color: 'bg-transparent' },
  { id: 'ent-4', name: 'STREAM VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert5.png', details: 'Influencer life.', color: 'bg-transparent' },
//   { id: 'ent-5', name: 'PARTY VIBE', price: 49
// , category: Category.ENTERTAINMENT, image: '/badge/badge6.png', details: 'The night is young.', color: 'bg-transparent' },
  // --- EVENTS ---
  { id: 'event-1', name: 'flag VIBE', price: 49, category: Category.EVENTS, image: '/badge/flag.png', details: 'Celebrate big.', color: 'bg-transparent' , isFeatured: true },


  { id: 'event-2', name: 'UNION VIBE', price: 49, category: Category.EVENTS, image: '/badge/event2.png', details: 'Wedding season.', color: 'bg-transparent' , isFeatured: true},
    { id: 'event-6', name: 'flag VIBE', price: 49, category: Category.EVENTS, image: '/badge/flagbadge.png', details: 'Celebrate big.', color: 'bg-transparent' , isFeatured: true },
  { id: 'event-3', name: 'FEST VIBE', price: 49, category: Category.EVENTS, image: '/badge/event3.png', details: 'Festival feelings.', color: 'bg-transparent' },
  { id: 'event-4', name: 'STAGE VIBE', price: 49, category: Category.EVENTS, image:'/badge/event4.png', details:'Concert ready.', color:'bg-transparent' },
  { id: 'event-5', name: 'Party VIBE', price: 49, category: Category.EVENTS, image: '/badge/event1.png', details: 'Birthday joy.', color: 'bg-transparent' },


  // --- ANIMAL ---
  { 
  id: 'animal-1',
  name: 'Bunny Bliss',
  price: 49,
  category: Category.ANIMAL,

  image: '/badge/bunny.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  color: 'bg-transparent',
  isFeatured: true
},

  { id: 'animal-2', name: 'Puppy Cheer', price: 49, category: Category.ANIMAL, image: '/badge/animal2.png', details: 'Best friend vibes.', color: 'bg-transparent' },
  { id: 'animal-3', name: 'Bunny Bliss', price: 49, category: Category.ANIMAL, image: '/badge/animal3.png', details: 'Chill panda energy.', color: 'bg-transparent' },
  { id: 'animal-4', name: 'Little Champion', price: 49, category: Category.ANIMAL, image: '/badge/animal4.png', details: 'Roaring strength.', color: 'bg-transparent' },
  // { id: 'animal-5', name: 'WILD VIBE', price: 49, category: Category.ANIMAL, image: '/badge/animal5.png', details: 'Adventure awaits.', color: 'bg-transparent' },

  // --- COUPLE ---
  { id: 'couple-1', name: 'SOUL VIBE', price: 49, category: Category.COUPLE, image: '/badge/c1.png', details: 'Soulmate status.', color: 'bg-transparent'},
  { id: 'couple-2', name: 'LOVE VIBE', price: 49, category: Category.COUPLE, image: '/badge/c2.png', details: 'Hearts combined.', color: 'bg-transparent', },
  { id: 'couple-3', name: 'BOND VIBE', price: 49, category: Category.COUPLE, image: '/badge/c3.png', details: 'Unbreakable connection.', color: 'bg-transparent' ,},
  { id: 'couple-4', name: 'DATE VIBE', price: 49, category: Category.COUPLE, image: '/badge/c4.png', details: 'Perfect evening.', color: 'bg-transparent',isFeatured: true},
  // { id: 'couple-5', name: 'FOREVER VIBE', price: 49, category: Category.COUPLE, image: '/badge/c5.png', details: 'Endless journey.', color: 'bg-transparent' },
  // --- ANIME ---
  { id: 'anime-1', name: 'HERO VIBE', price: 49
, category: Category.ANIME, image: '/badge/anime1.png', details: 'Main character energy.', color: '' },
  { id: 'anime-2', name: 'Demon Hunter', price: 49
, category: Category.ANIME, image: '/badge/anime2.png', details: 'Path of the ninja.', color: '' , isFeatured: true},
  { id: 'anime-3', name: 'Grand Voyage', price: 49
, category: Category.ANIME, image: '/badge/anime3.png', details: 'Over 9000 power.', color: '' },
  { id: 'anime-4', name: 'Ninja Resolve', price: 49
, category: Category.ANIME, image: '/badge/anime4.png', details: 'Finding the treasure.', color: '' },
//   { id: 'anime-5', name: 'KAWAII VIBE', price: 49
// , category: Category.ANIME, image: '/badge/badge6.png', details: 'Super cute style.', color: '' },
];
