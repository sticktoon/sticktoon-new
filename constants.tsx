
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
    id: 'pet',
    name: 'PET',
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
  // --- COMBO PACKS (All-in-One per category) ---
  { id: 'combo-moody', name: 'Moody Combo Pack', price: 149, category: Category.MOODY, image: '/badge/mergemoody.png', details: 'Get all Moody badges in one combo pack!', tagline: 'All Moody badges in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-sports', name: 'Sports Combo Pack', price: 149, category: Category.SPORTS, image: '/badge/mergesport.png', details: 'Get all Sports badges in one combo pack!', tagline: 'All Sports badges in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-religious', name: 'Religious Combo Pack', price: 149, category: Category.RELIGIOUS, image: '/badge/mergereligious.png', details: 'Get all Religious badges in one combo pack!', tagline: 'All Religious badges in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-entertainment', name: 'Entertainment Combo', price: 149, category: Category.ENTERTAINMENT, image: '/badge/mergeenter.png', details: 'Get all Entertainment badges in one combo pack!', tagline: 'All Entertainment in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-events', name: 'Events Combo Pack', price: 149, category: Category.EVENTS, image: '/badge/mergeevent.png', details: 'Get all Events badges in one combo pack!', tagline: 'All Events badges in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-pet', name: 'Pet Combo Pack', price: 149, category: Category.PET, image: '/badge/mergeanimal.png', details: 'Get all Pet badges in one combo pack!', tagline: 'All Pet badges in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-couple', name: 'Couple Combo Pack', price: 149, category: Category.COUPLE, image: '/badge/mergecouple.png', details: 'Get all Couple badges in one combo pack!', tagline: 'All Couple badges in one', color: 'bg-transparent', isCombo: true },
  { id: 'combo-anime', name: 'Anime Combo Pack', price: 149, category: Category.ANIME, image: '/badge/mergeanime.png', details: 'Get all Anime badges in one combo pack!', tagline: 'All Anime badges in one', color: 'bg-transparent', isCombo: true },

  // --- MOODY (Reordered: Angry Vibe is now FIRST) ---
  { 
    id: 'moody-5', 
    name: 'Joy Pop', 
    price: 49, 
    category: Category.MOODY, 
    image: '/badge/moody2.png', 
    details: 'Serious face only. Let them know you mean business.', 
    color: 'bg-transparent', 
    // isFeatured: true 
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



  // { id: 'moody-4', name: 'SHOCKED VIBE', price: 49, category: Category.MOODY, image: '/badge/moody5.png', details: 'OMG moments only.', color: 'bg-transparent', isFeatured: true },

  // --- SPORTS ---
  { id: 'sports-1', name: 'Victory Kick', price: 49, category: Category.SPORTS, image: '/badge/sports4.png', details: 'The cricket spirit.', tagline: 'Champion energy for winners', color: 'bg-transparent' },
 { id: 'sports-2', name: 'Slam Point', price: 49, category: Category.SPORTS, image: '/badge/sports3.png', details: 'For the football fanatics.', tagline: 'Show your game spirit', color: 'bg-transparent' },
{ id: 'sports-3', name: 'Strike Force', price: 49, category: Category.SPORTS, image: '/badge/sports1.png', details: 'Nothing but net.', tagline: 'Victory is our passion', color: 'bg-transparent',},
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


  { id: 'event-2', name: 'UNION VIBE', price: 49, category: Category.EVENTS, image: '/badge/event2.png', details: 'Wedding season.', tagline: 'Love brings people together', color: 'bg-transparent' , },
    { id: 'event-6', name: 'flag VIBE', price: 49, category: Category.EVENTS, image: '/badge/flagbadge.png', details: 'Celebrate big.', tagline: 'Events that remind us to celebrate', color: 'bg-transparent' , },
  { id: 'event-3', name: 'FEST VIBE', price: 49, category: Category.EVENTS, image: '/badge/event3.png', details: 'Festival feelings.', tagline: 'Festival spirit unites us', color: 'bg-transparent' },
  { id: 'event-4', name: 'STAGE VIBE', price: 49, category: Category.EVENTS, image:'/badge/event4.png', details:'Concert ready.', tagline: 'Your moment to shine', color:'bg-transparent' },
  { id: 'event-5', name: 'Party VIBE', price: 49, category: Category.EVENTS, image: '/badge/event1.png', details: 'Birthday joy.', tagline: 'Celebrate your special day', color: 'bg-transparent' },


  // --- PET ---
  { 
  id: 'pet-1',
  name: 'Bunny Bliss',
  price: 49,
  category: Category.PET,

  image: '/badge/Cute_Dog.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  isFeatured: true
},

{ 
  id: 'pet-2',
  name: 'Bunny Bliss',
  price: 49,
  category: Category.PET,

  image: '/badge/Brownclassic_Dog.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  isFeatured: true
},

{ 
  id: 'pet-3',
  name: 'Puppy Cheer',
  price: 49,
  category: Category.PET,

  image: '/badge/Dogs.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  // isFeatured: true
},

{ 
  id: 'pet-5',
  name: 'Kitten Joy',
  price: 49,
  category: Category.PET,

  image: '/badge/bunny.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  // isFeatured: true
},

{ 
  id: 'pet-6',
  name: 'Kitten Joy',
  price: 49,
  category: Category.PET,

  image: '/badge/bunny.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  // isFeatured: true
},
  { 
  id: 'pet-7',
  name: 'Bunny Bliss',
  price: 49,
  category: Category.PET,

  image: '/badge/bunny.png',          // pin image
  imageMagnetic: '/badge/magnectbadge.png', // magnetic image

  details: 'Cat lovers only.',
  tagline: 'Furry friends forever',
  color: 'bg-transparent',
  isFeatured: true
},

  { id: 'pet-8', name: 'Puppy Cheer', price: 49, category: Category.PET, image: '/badge/animal2.png', details: 'Best friend vibes.', tagline: 'Love for our loyal companions', color: 'bg-transparent' },
  { id: 'pet-9', name: 'Bunny Bliss', price: 49, category: Category.PET, image: '/badge/animal3.png', details: 'Chill panda energy.', tagline: "Nature's gentle souls", color: 'bg-transparent' },
  { id: 'pet-10', name: 'Little Champion', price: 49, category: Category.PET, image: '/badge/animal4.png', details: 'Roaring strength.', tagline: 'Wild and free spirit', color: 'bg-transparent' },
  // { id: 'pet-5', name: 'WILD VIBE', price: 49, category: Category.PET, image: '/badge/animal5.png', details: 'Adventure awaits.', color: 'bg-transparent' },

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

// Sticker Categories
export const STICKER_CATEGORIES = [
  {
    id: 'sticker-pack',
    name: 'STICKER PACK',
    icon: '📦',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'marvel',
    name: 'MARVEL',
    icon: '🦸',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'dc-universe',
    name: 'DC UNIVERSE',
    icon: '🦇',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'dog',
    name: 'DOG',
    icon: '🐕',
    image: '/sticker/DogStickers.jpeg',
  },
  {
    id: 'love',
    name: 'LOVE',
    icon: '💕',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'anime',
    name: 'ANIME',
    icon: '🎌',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'cartoon',
    name: 'CARTOON',
    icon: '🎨',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'sports',
    name: 'SPORTS',
    icon: '🏆',
    image: '/sticker/mergesticker.jpeg',
  },
  {
    id: 'random',
    name: 'RANDOM',
    icon: '🎲',
    image: '/sticker/mergesticker.jpeg',
  },
];

// Sticker Products
export type Sticker = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  details: string;
  tagline?: string;
  isFeatured?: boolean;
};

export const STICKERS: Sticker[] = [
  // Sticker Pack (Whole Pack)
  { id: 'sticker-pack-1', name: "CATCH 'EM ALL IN ONE PACK", price: 140, category: 'sticker-pack', image: '/sticker/mergesticker.jpeg', tagline: 'Ultimate Pokémon Pack', details: 'Complete collection of Pokémon stickers in one pack', isFeatured: true },
  { id: 'sticker-pack-2', name: 'Anime Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/anime.jpeg', details: 'Full anime sticker collection bundle.', tagline: 'Ultimate anime bundle' },
  { id: 'sticker-pack-3', name: 'Cartoon Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/cartoon.jpeg', details: 'All cartoon stickers in one bundle.', tagline: 'Cartoon lovers paradise' },
   
  { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/shinshanmerge.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true },
    { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/mergepack1.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true },
      { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/coder.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true },
        { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/mergepack2.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true },
      { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/mergepack3.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true },  
       { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/catpack.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true },  
       { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/flpack.jpg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true }, 
     { id: 'sticker-pack-4', name: 'Mix Mega Pack', price: 140, category: 'sticker-pack', image: '/sticker/random.jpeg', details: 'Best of everything mixed sticker pack.', tagline: 'The ultimate collection', isFeatured: true }, 


  // Marvel
  { id: 'sticker-marvel-4', name: 'Thor', price: 15, category: 'marvel', image: '/sticker/spiderman.jpeg', details: 'God of Thunder sticker.', tagline: 'Worthy of the hammer' },
   { id: 'sticker-marvel-4', name: 'Thor', price: 15, category: 'marvel', image: '/sticker/spider.jpeg', details: 'God of Thunder sticker.', tagline: 'Worthy of the hammer' },
   { 
  id: 'sticker-hero-1',
  name: 'Venomized Spider',
  price: 15,
  category: 'marvel',
  image: '/sticker/danyoh.jpeg',
  details: 'Dark symbiote Spider sticker.',
  tagline: 'Unleash the symbiote',
  isFeatured: true
},

{ 
  id: 'sticker-hero-2',
  name: 'Deadpool',
  price: 15,
  category: 'dmarvel',
  image: '/sticker/DC1.jpeg',
  details: 'Merc with a mouth sticker.',
  tagline: 'Maximum effort'
},{ 
  id: 'sticker-hero-4',
  name: 'Iron Man Helmet',
  price: 15,
  category: 'marvel',
  image: '/sticker/dc4.jpeg',
  details: 'Armored Avenger helmet sticker.',
  tagline: 'Powered by technology'
},

{ 
  id: 'sticker-hero-5',
  name: 'Chibi Thor',
  price: 15,
  category: 'marvel',
  image: '/sticker/dc3.jpeg',
  details: 'Cute thunder god sticker.',
  tagline: 'God of thunder'
},

{ 
  id: 'sticker-hero-6',
  name: 'Avengers Logo',
  price: 15,
  category: 'marvel',
  image: '/sticker/dc5.jpeg',
  details: 'Avengers assemble emblem.',
  tagline: 'Earth’s mightiest heroes'
},
{ 
  id: 'sticker-hero-10',
  name: 'Iron Man Poster',
  price: 15,
  category: 'marvel',
  image: '/sticker/dc8.jpeg',
  details: 'Classic Iron Man armor sticker.',
  tagline: 'Genius. Billionaire. Hero.'
},{ 
  id: 'sticker-hero-7',
  name: 'Hulk Smash',
  price: 15,
  category: 'marvel',
  image: '/sticker/halku.jpeg',
  details: 'Incredible Hulk rage sticker.',
  tagline: 'Smash mode activated'
},


  // DC Universe
 // DC / Superhero Stickers



{ 
  id: 'sticker-hero-3',
  name: 'Wonder Woman',
  price: 15,
  category: 'dc-universe',
  image: '/sticker/DC2.jpeg',
  details: 'Amazon warrior sticker.',
  tagline: 'Divine protector'
},




{ 
  id: 'sticker-hero-8',
  name: 'Batman Mask',
  price: 15,
  category: 'dc-universe',
  image: '/sticker/dc6.jpeg',
  details: 'Dark Knight mask sticker.',
  tagline: 'Gotham’s guardian'
},

{ 
  id: 'sticker-hero-9',
  name: 'Dark Knight',
  price: 15,
  category: 'dc-universe',
  image: '/sticker/dc7.jpeg',
  details: 'Shadow Batman silhouette.',
  tagline: 'Fear the night'
},
{
  id: 'sticker-dc-5',
  name: 'Superman Logo',
  price: 15,
  category: 'dc-universe',
  image: '/sticker/anime3.jpeg',
  details: 'Iconic Superman shield logo sticker.',
  tagline: 'Man of Steel'
},

  // Dog
  { id: 'sticker-dog-1', name: 'Puppy Love', price: 15, category: 'dog', image: '/sticker/DogStickers.jpeg', details: 'Cute puppy sticker.', tagline: 'Dogs are love', isFeatured: true },
  { id: 'sticker-dog-2', name: 'Loyal Pals', price: 15, category: 'dog', image: '/sticker/dodmix1.jpeg', details: 'Friendship forever sticker.', tagline: 'Best friend vibes' },
  { id: 'sticker-dog-3', name: 'Happy Woof', price: 15, category: 'dog', image: '/sticker/dog1.jpeg', details: 'Joyful dog sticker.', tagline: 'Wag that tail' },
  { id: 'sticker-dog-4', name: 'Pawsitivity', price: 15, category: 'dog', image: '/sticker/dog2.jpeg', details: 'Positive paws sticker.', tagline: 'Spread happiness' },
 { id: 'sticker-dog-4', name: 'Pawsitivity', price: 15, category: 'dog', image: '/sticker/dog3.jpeg', details: 'Positive paws sticker.', tagline: 'Spread happiness' }, 
 { id: 'sticker-dog-4', name: 'Pawsitivity', price: 15, category: 'dog', image: '/sticker/dog4.jpeg', details: 'Positive paws sticker.', tagline: 'Spread happiness' },
 { id: 'sticker-dog-4', name: 'Pawsitivity', price: 15, category: 'dog', image: '/sticker/dog5.jpeg', details: 'Positive paws sticker.', tagline: 'Spread happiness' },
 { id: 'sticker-dog-4', name: 'Pawsitivity', price: 15, category: 'dog', image: '/sticker/dog6.jpeg', details: 'Positive paws sticker.', tagline: 'Spread happiness' },
 { id: 'sticker-dog-4', name: 'Pawsitivity', price: 15, category: 'dog', image: '/sticker/dog7.jpeg', details: 'Positive paws sticker.', tagline: 'Spread happiness' },

  // Love
  { id: 'sticker-love-1', name: 'Heartbeat', price: 15, category: 'love', image: '/sticker/mergesticker.jpeg', details: 'Love heartbeat sticker.', tagline: 'Love conquers all', isFeatured: true },
  { id: 'sticker-love-2', name: 'Forever Love', price: 15, category: 'love', image: '/sticker/mergesticker.jpeg', details: 'Eternal love sticker.', tagline: 'Love without limits' },
  { id: 'sticker-love-3', name: 'Soulmates', price: 15, category: 'love', image: '/sticker/mergesticker.jpeg', details: 'Perfect match sticker.', tagline: 'Two hearts, one soul' },
  { id: 'sticker-love-4', name: 'Cupid\'s Arrow', price: 15, category: 'love', image: '/sticker/mergesticker.jpeg', details: 'Love strike sticker.', tagline: 'Hit by love' },

  // Anime
  // Anime

{ 
  id: 'sticker-anime-1',
  name: 'Anime Hero Pack',
  price: 15,
  category: 'anime',
  image: '/sticker/anime.jpeg',
  details: 'Main anime character sticker pack.',
  tagline: 'Anime spirit within',
  isFeatured: true
},

{ 
  id: 'sticker-anime-2',
  name: 'Dragon Power',
  price: 15,
  category: 'anime',
  image: '/sticker/animemix.jpeg',
  details: 'Dragon energy anime sticker.',
  tagline: 'Over 9000!'
},

{ 
  id: 'sticker-anime-3',
  name: 'Kawaii Cutie',
  price: 15,
  category: 'anime',
  image: '/sticker/animemix1.jpeg',
  details: 'Adorable chibi anime sticker.',
  tagline: 'Super cute'
},

{ 
  id: 'sticker-anime-4',
  name: 'Itachi Uchiha',
  price: 15,
  category: 'anime',
  image: '/sticker/yah.jpeg',
  details: 'Itachi Uchiha ninja sticker.',
  tagline: 'Hidden in shadows'
},

{ 
  id: 'sticker-anime-5',
  name: 'Baki Hanma',
  price: 15,
  category: 'anime',
  image: '/sticker/anime1.jpeg',
  details: 'Baki Hanma fighter sticker.',
  tagline: 'Ultimate strength'
},

{ 
  id: 'sticker-anime-6',
  name: 'Roronoa Zoro',
  price: 15,
  category: 'anime',
  image: '/sticker/anime5.jpeg',
  details: 'Zoro swordsman chibi sticker.',
  tagline: 'Three sword style'
},

{ 
  id: 'sticker-anime-7',
  name: 'Obito Uchiha',
  price: 15,
  category: 'anime',
  image: '/sticker/anime6.jpeg',
  details: 'Obito Uchiha anime sticker.',
  tagline: 'Masked ninja'
},

{ 
  id: 'sticker-anime-8',
  name: 'Naruto Uzumaki',
  price: 15,
  category: 'anime',
  image: '/sticker/anime7.jpeg',
  details: 'Naruto ninja hero sticker.',
  tagline: 'Believe it!'
},

{ 
  id: 'sticker-anime-9',
  name: 'Monkey D Luffy',
  price: 15,
  category: 'anime',
  image: '/sticker/anime8.jpeg',
  details: 'Luffy pirate anime sticker.',
  tagline: 'Future Pirate King'
},

{ 
  id: 'sticker-anime-10',
  name: 'Anime Squad',
  price: 15,
  category: 'anime',
  image: '/sticker/anime9.jpeg',
  details: 'Mixed anime characters sticker.',
  tagline: 'Ultimate anime crew'
},


// Cartoon

// Cartoon (Shinchan / Pokémon)

{ 
  id: 'sticker-cartoon-1',
  name: 'Shinchan Snack Time',
  price: 15,
  category: 'cartoon',
  image: '/sticker/shinshan.jpeg',
  details: 'Shinchan enjoying his favorite snack.',
  tagline: 'Snack attack!'
},

{ 
  id: 'sticker-cartoon-2',
  name: 'Pikachu Joy',
  price: 15,
  category: 'cartoon',
  image: '/sticker/pokemon.jpeg',
  details: 'Happy Pikachu full of energy.',
  tagline: 'Electric vibes!'
},

{ 
  id: 'sticker-cartoon-3',
  name: 'Pokémon Trainer',
  price: 15,
  category: 'cartoon',
  image: '/sticker/pokemon1.jpeg',
  details: 'Trainer ready to catch Pokémon.',
  tagline: 'Gotta catch ’em all!'
},

{ 
  id: 'sticker-cartoon-4',
  name: 'Shinchan Love',
  price: 15,
  category: 'cartoon',
  image: '/sticker/loveshinshan.jpeg',
  details: 'Shinchan showing love.',
  tagline: 'Heart full of mischief'
},

{ 
  id: 'sticker-cartoon-5',
  name: 'Shinchan Hello',
  price: 15,
  category: 'cartoon',
  image: '/sticker/helloshinshan.jpeg',
  details: 'Shinchan greeting everyone.',
  tagline: 'Hello there!'
},

{ 
  id: 'sticker-cartoon-6',
  name: 'Shinchan Shocked',
  price: 15,
  category: 'cartoon',
  image: '/sticker/sideeyeshin.jpeg',
  details: 'Funny shocked Shinchan face.',
  tagline: 'Wait… what?!'
},

{ 
  id: 'sticker-cartoon-7',
  name: 'Shinchan Hearts',
  price: 15,
  category: 'cartoon',
  image: '/sticker/shinshan2.jpeg',
  details: 'Shinchan with heart eyes.',
  tagline: 'Too cute!'
},

{ 
  id: 'sticker-cartoon-8',
  name: 'Phone Call Shinchan',
  price: 15,
  category: 'cartoon',
  image: '/sticker/helloshin.jpeg',
  details: 'Shinchan chatting on the phone.',
  tagline: 'Hello hello!'
},

{ 
  id: 'sticker-cartoon-9',
  name: 'Happy Shinchan',
  price: 15,
  category: 'cartoon',
  image: '/sticker/shinshan1.jpeg',
  details: 'Classic playful Shinchan.',
  tagline: 'Mischief mode on!'
},

{ 
  id: 'sticker-cartoon-10',
  name: 'Shinchan Wink',
  price: 15,
  category: 'cartoon',
  image: '/sticker/maishinshan.jpeg',
  details: 'Cheeky Shinchan expression.',
  tagline: 'Too cool!'
},

{ 
  id: 'sticker-cartoon-11',
  name: 'Classic Shinchan',
  price: 15,
  category: 'cartoon',
  image: '/sticker/shinshan.jpeg',
  details: 'Iconic Shinchan pose.',
  tagline: 'Legendary mischief!'
},

{ 
  id: 'sticker-cartoon-12',
  name: 'Bulbasaur',
  price: 15,
  category: 'cartoon',
  image: '/sticker/anime2.jpeg',
  details: 'Cute Bulbasaur Pokémon sticker.',
  tagline: 'Grass-type starter'
},


 // Sports
{ id: 'sticker-sports-1', name: 'MSN Trio', price: 15, category: 'sports', image: '/sticker/sports.jpeg', details: 'Legendary Barcelona trio sticker.', tagline: 'Football’s deadliest attack', isFeatured: true },

{ id: 'sticker-sports-2', name: 'World Cup Glory', price: 15, category: 'sports', image: '/sticker/sports1.jpeg', details: 'Champion lifting the World Cup trophy.', tagline: 'Dream. Fight. Win.' },

{ id: 'sticker-sports-3', name: 'FC Barcelona Crest', price: 15, category: 'sports', image: '/sticker/sports2.jpeg', details: 'Classic FC Barcelona crest sticker.', tagline: 'Més que un club' },

{ id: 'sticker-sports-4', name: 'Formula Speed', price: 15, category: 'sports', image: '/sticker/sports3.jpeg', details: 'High-speed Formula 1 racing sticker.', tagline: 'Built for speed' },

{ id: 'sticker-sports-5', name: 'Cricket King', price: 15, category: 'sports', image: '/sticker/sports4.jpeg', details: 'Cricket legend trophy celebration.', tagline: 'Rule the pitch' },





 // Random

{ id: 'sticker-random-1', name: 'Mystery Sticker Pack', price: 15, category: 'random', image: '/sticker/random.jpeg', details: 'A mixed pack of surprise stickers.', tagline: 'What will you get?', isFeatured: true },

{ id: 'sticker-random-2', name: 'How You Doin?', price: 15, category: 'random', image: '/sticker/Howrudoin.jpeg', details: 'Classic Joey catchphrase sticker.', tagline: 'How you doin?' },

{ id: 'sticker-random-3', name: 'Saitama Peace', price: 15, category: 'random', image: '/sticker/hehe.jpeg', details: 'One Punch Man chill sticker.', tagline: 'Peace mode' },

{ id: 'sticker-random-4', name: 'Developer Stack', price: 15, category: 'random', image: '/sticker/coder.jpeg', details: 'Programming languages and dev tools sticker.', tagline: 'Code the future' },

{ id: 'sticker-random-5', name: 'Peas Out', price: 15, category: 'random', image: '/sticker/random1.jpeg', details: 'Funny pea pod cartoon sticker.', tagline: 'Peas out!' },

{ id: 'sticker-random-6', name: 'Beast Mode', price: 15, category: 'random', image: '/sticker/random2.jpeg', details: 'Workout motivation sticker.', tagline: 'Beast mode activated' },

{ id: 'sticker-random-7', name: 'Lightweight Champion', price: 15, category: 'random', image: '/sticker/random3.jpeg', details: 'Bodybuilding motivation sticker.', tagline: 'Yeah buddy!' },

{ id: 'sticker-random-8', name: 'BMW Street Racer', price: 15, category: 'random', image: '/sticker/car1.jpeg', details: 'Custom racing BMW design sticker.', tagline: 'Street racing vibes' },

{ id: 'sticker-random-9', name: 'Motivation Guru', price: 15, category: 'random', image: '/sticker/random4.jpeg', details: 'Motivational guru typography sticker.', tagline: 'Stay inspired' },

{ id: 'sticker-random-10', name: 'Lightning Bolt', price: 15, category: 'random', image: '/sticker/random5.jpeg', details: 'Electric lightning icon sticker.', tagline: 'Charge up!' },

{ id: 'sticker-random-11', name: 'Turbo Boost', price: 15, category: 'random', image: '/sticker/random6.jpeg', details: 'Turbo engine performance sticker.', tagline: 'VVVPSHHHH!' },

{ id: 'sticker-random-12', name: 'Warning Sign', price: 15, category: 'random', image: '/sticker/random7.jpeg', details: 'Classic caution sign sticker.', tagline: 'Proceed with caution' },

{ id: 'sticker-random-13', name: 'Science Humor', price: 15, category: 'random', image: '/sticker/random8.jpeg', details: 'Periodic table sarcasm sticker.', tagline: 'Primary elements of humor' },

{ id: 'sticker-random-14', name: 'Avengers Assemble', price: 15, category: 'random', image: '/sticker/random9.jpeg', details: 'Marvel heroes assemble sticker.', tagline: 'Heroes unite' },

{ id: 'sticker-random-15', name: 'Porsche 911 Classic', price: 15, category: 'random', image: '/sticker/car.jpeg', details: 'Vintage Porsche sports car sticker.', tagline: 'Unleash the legend' }
 
];