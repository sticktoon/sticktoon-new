
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
    id: 'positive-vibes',
    name: 'POSITIVE VIBES',
    count: 4,
    icon: '✨',
    image: '/badge/mergemoody.png',
  },
  {
    id: 'moody',
    name: 'MOODY',
    count: 5,
    icon: '😊',
    image: '/badge/mergemoody.png',
  },
  {
    id: 'sports',
    name: 'SPORTS',
    count: 5,
    icon: '🏆',
    image: '/badge/mergesport.png',
  },
  {
    id: 'religious',
    name: 'RELIGIOUS',
    count: 5,
    icon: '🕉️',
    image: '/badge/mergereligious.png',
  },
  {
    id: 'entertainment',
    name: 'ENTERTAINMENT',
    count: 5,
    icon: '🎭',
    image: '/badge/mergeenter.png',
  },
  {
    id: 'events',
    name: 'EVENTS',
    count: 5,
    icon: '🎉',
    image: '/badge/mergeevent.png',
  },
  {
    id: 'animal',
    name: 'ANIMAL',
    count: 5,
    icon: '🐾',
    image: '/badge/mergeanimal.png',
  },
  {
    id: 'couple',
    name: 'COUPLE',
    count: 5,
    icon: '💑',
    image: '/badge/mergecouple.png',
  },
  {
    id: 'anime',
    name: 'ANIME',
    count: 5,
    icon: '🎌',
    image: '/badge/mergeanime.png',
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
   
  
  { id: 'moody-1', name: "Crushin'", price: 49, category: Category.MOODY, image: '/badge/moody1.png', details: 'Spread pure joy.', tagline: 'We create moments of happiness', color: 'bg-transparent' },
  { id: 'moody-2', name: 'OMG Mood', price: 49, category: Category.MOODY, image: '/badge/moody3.png', details: 'Feel the love.', tagline: 'Wear your emotions with pride', color: 'bg-transparent' },
  { id: 'moody-3', name: "Just Vibin'", price: 49, category: Category.MOODY, image: '/badge/moody4.png', details: 'Pure comedy gold.', tagline: 'Express your true self', color: 'bg-transparent',  },

  // --- POSITIVE VIBES ---
  { id: 'positive-1', name: 'Good Vibes', price: 49, category: Category.POSITIVE_VIBES, image: '/badge/chat.png', details: 'Glow from within.', tagline: 'Good energy only', color: 'bg-transparent' },
  { id: 'positive-2', name: 'Kind Spark', price: 49, category: Category.POSITIVE_VIBES, image: '/badge/chat1.png', details: 'Be the reason to smile.', tagline: 'Kindness is contagious', color: 'bg-transparent' },
  { id: 'positive-3', name: 'Bright Day', price: 49, category: Category.POSITIVE_VIBES, image: '/badge/flagb1.png', details: 'Little joys, big smiles.', tagline: 'Choose happy today', color: 'bg-transparent' },
  { id: 'positive-4', name: 'Smile Mode', price: 49, category: Category.POSITIVE_VIBES, image: '/badge/bunny.png', details: 'Keep it light.', tagline: 'Smile, sparkle, repeat', color: 'bg-transparent' },

  // { id: 'moody-4', name: 'SHOCKED VIBE', price: 49, category: Category.MOODY, image: '/badge/moody5.png', details: 'OMG moments only.', color: 'bg-transparent', isFeatured: true },

  // --- SPORTS ---
  { id: 'sports-1', name: 'Victory Kick', price: 49, category: Category.SPORTS, image: '/badge/sports4.png', details: 'The cricket spirit.', tagline: 'Champion energy for winners', color: 'bg-transparent' },
 { id: 'sports-2', name: 'Slam Point', price: 49, category: Category.SPORTS, image: '/badge/sports3.png', details: 'For the football fanatics.', tagline: 'Show your game spirit', color: 'bg-transparent' },
{ id: 'sports-3', name: 'Strike Force', price: 49, category: Category.SPORTS, image: '/badge/sports1.png', details: 'Nothing but net.', tagline: 'Victory is our passion', color: 'bg-transparent', isFeatured: true},
{ id: 'sports-4', name: 'Power Play', price: 49, category: Category.SPORTS, image: '/badge/sports2.png', details: 'Game, set, match.', tagline: 'Celebrate the thrill', color: 'bg-transparent' },

  // { id: 'sports-5', name: 'ACTIVE VIBE', price: 49, category: Category.SPORTS, image: '/badge/sports4.png', details: 'Keep moving.', color: 'bg-transparent' },
  
  // --- RELIGIOUS ---
  { id: 'spiritual-1', name: 'Vighnaharta', price: 49, category: Category.RELIGIOUS, image: '/badge/R1.png', details: 'Find your peace.', tagline: 'We create for the soul', color: 'bg-transparent'},
  { id: 'spiritual-2', name: 'Divine Shiva', price: 49, category: Category.RELIGIOUS, image: '/badge/R2.png', details: 'Sacred energy.', tagline: 'Spiritual connection awakens', color: 'bg-transparent'  },
  { id: 'spiritual-3', name: 'Flute of Faith', price: 49, category: Category.RELIGIOUS, image: '/badge/R5.png', details: 'Universal love.', tagline: 'Divine harmony in every heart', color: 'bg-transparent'},
  { id: 'spiritual-4', name: 'Sacred Strength', price: 49, category: Category.RELIGIOUS, image: '/badge/R4.png', details: 'Ancient symbols.', tagline: 'Bond with timeless traditions', color: 'bg-transparent', isFeatured: true },
  // { id: 'spiritual-5', name: 'LIGHT VIBE', price: 49, category: Category.RELIGIOUS, image: '/badge/R5.png', details: 'Inner illumination.', color: 'bg-transparent' },
  
  // --- ENTERTAINMENT ---
  { id: 'ent-1', name: 'GAMER VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert2.png', details: 'Level up.', tagline: 'For the gaming legends', color: 'bg-transparent' , isFeatured: true},
  { id: 'ent-2', name: 'CINEMA VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert4.png', details: 'Movie magic.', tagline: 'Cinematic moments matter', color: 'bg-transparent' },
  { id: 'ent-3', name: 'DISCO VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert4.png', details: 'Music to ears.', tagline: 'Dance to your rhythm', color: 'bg-transparent' },
  { id: 'ent-4', name: 'STREAM VIBE', price: 49
, category: Category.ENTERTAINMENT, image: '/badge/entert5.png', details: 'Influencer life.', tagline: 'Influence the world', color: 'bg-transparent' },
//   { id: 'ent-5', name: 'PARTY VIBE', price: 49
// , category: Category.ENTERTAINMENT, image: '/badge/badge6.png', details: 'The night is young.', color: 'bg-transparent' },
  // --- EVENTS ---
  { id: 'event-1', name: 'flag VIBE', price: 49, category: Category.EVENTS, image: '/badge/flag.png', details: 'Celebrate big.', tagline: 'Make every moment count', color: 'bg-transparent' , isFeatured: true },


  { id: 'event-2', name: 'UNION VIBE', price: 49, category: Category.EVENTS, image: '/badge/event2.png', details: 'Wedding season.', tagline: 'Love brings people together', color: 'bg-transparent' , isFeatured: true},
    { id: 'event-6', name: 'flag VIBE', price: 49, category: Category.EVENTS, image: '/badge/flagbadge.png', details: 'Celebrate big.', tagline: 'Events that remind us to celebrate', color: 'bg-transparent' , isFeatured: true },
  { id: 'event-3', name: 'FEST VIBE', price: 49, category: Category.EVENTS, image: '/badge/event3.png', details: 'Festival feelings.', tagline: 'Festival spirit unites us', color: 'bg-transparent' },
  { id: 'event-4', name: 'STAGE VIBE', price: 49, category: Category.EVENTS, image:'/badge/event4.png', details:'Concert ready.', tagline: 'Your moment to shine', color:'bg-transparent' },
  { id: 'event-5', name: 'Party VIBE', price: 49, category: Category.EVENTS, image: '/badge/event1.png', details: 'Birthday joy.', tagline: 'Celebrate your special day', color: 'bg-transparent' },


  // --- ANIMAL ---
  { 
  id: 'animal-1',
  name: 'Bunny Bliss',
  price: 49,
  category: Category.ANIMAL,

  image: '/badge/bunny.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  isFeatured: true
},

  { id: 'animal-2', name: 'Puppy Cheer', price: 49, category: Category.ANIMAL, image: '/badge/animal2.png', details: 'Best friend vibes.', tagline: 'Love for our loyal companions', color: 'bg-transparent' },
  { id: 'animal-3', name: 'Bunny Bliss', price: 49, category: Category.ANIMAL, image: '/badge/animal3.png', details: 'Chill panda energy.', tagline: "Nature's gentle souls", color: 'bg-transparent' },
  { id: 'animal-4', name: 'Little Champion', price: 49, category: Category.ANIMAL, image: '/badge/animal4.png', details: 'Roaring strength.', tagline: 'Wild and free spirit', color: 'bg-transparent' },
  // { id: 'animal-5', name: 'WILD VIBE', price: 49, category: Category.ANIMAL, image: '/badge/animal5.png', details: 'Adventure awaits.', color: 'bg-transparent' },

  // --- COUPLE ---
  { id: 'couple-1', name: 'SOUL VIBE', price: 49, category: Category.COUPLE, image: '/badge/c1.png', details: 'Soulmate status.', tagline: 'Two souls, one heart', color: 'bg-transparent'},
  { id: 'couple-2', name: 'LOVE VIBE', price: 49, category: Category.COUPLE, image: '/badge/c2.png', details: 'Hearts combined.', tagline: 'Love conquers all', color: 'bg-transparent', },
  { id: 'couple-3', name: 'BOND VIBE', price: 49, category: Category.COUPLE, image: '/badge/c3.png', details: 'Unbreakable connection.', tagline: 'Forever bonded together', color: 'bg-transparent' ,},
  { id: 'couple-4', name: 'DATE VIBE', price: 49, category: Category.COUPLE, image: '/badge/c4.png', details: 'Perfect evening.', tagline: 'Cherish every moment', color: 'bg-transparent',isFeatured: true},
  // { id: 'couple-5', name: 'FOREVER VIBE', price: 49, category: Category.COUPLE, image: '/badge/c5.png', details: 'Endless journey.', color: 'bg-transparent' },
  // --- ANIME ---
  { id: 'anime-1', name: 'HERO VIBE', price: 49
, category: Category.ANIME, image: '/badge/anime1.png', details: 'Main character energy.', tagline: 'Be your own hero', color: '' },
  { id: 'anime-2', name: 'Demon Hunter', price: 49
, category: Category.ANIME, image: '/badge/anime2.png', details: 'Path of the ninja.', tagline: 'Ninja strength within', color: '' , isFeatured: true},
  { id: 'anime-3', name: 'Grand Voyage', price: 49
, category: Category.ANIME, image: '/badge/anime3.png', details: 'Over 9000 power.', tagline: 'Adventure awaits always', color: '' },
  { id: 'anime-4', name: 'Ninja Resolve', price: 49
, category: Category.ANIME, image: '/badge/anime4.png', details: 'Finding the treasure.', tagline: 'Quest for greatness', color: '' },
//   { id: 'anime-5', name: 'KAWAII VIBE', price: 49
// , category: Category.ANIME, image: '/badge/badge6.png', details: 'Super cute style.', color: '' },
];
