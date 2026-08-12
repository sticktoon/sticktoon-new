import { API_BASE_URL } from '../config/api';

export interface HeroBadgeItem {
  id: string;
  name?: string;
  image: string;
  category?: string;
}

export const FALLBACK_HERO_BADGES = [
  { img: "/images/a.png", cat: "pet", id: "pet-1" },
  { img: "/images/h.png", cat: "religious", id: "spiritual-1" },
  { img: "/images/b.png", cat: "moody", id: "moody-1" },
  { img: "/images/flag2.png", cat: "events", id: "event-1" },
  { img: "/images/d.png", cat: "entertainment", id: "ent-1" },
  { img: "/images/e.png", cat: "couple", id: "couple-1" },
  { img: "/images/f.png", cat: "anime", id: "anime-1" },
  { img: "/images/g.png", cat: "events", id: "event-5" },
  { img: "/images/c.png", cat: "anime", id: "anime-2" },
];

let cachedHeroBadges: HeroBadgeItem[] | null = null;
let inFlightPromise: Promise<HeroBadgeItem[]> | null = null;

export function fetchHeroBadges(): Promise<HeroBadgeItem[]> {
  if (cachedHeroBadges) {
    return Promise.resolve(cachedHeroBadges);
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?type=badge&all=true`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const list: any[] = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);

      // Sort by creation date descending (newest first)
      const sorted = list
        .filter((p: any) => p.isActive !== false)
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const mapped: HeroBadgeItem[] = sorted.map((p: any) => ({
        id: p._id,
        name: p.name,
        image: p.image || '/badge/placeholder.png',
        category: p.category || 'all',
      }));

      if (mapped.length < 9) {
        const fallbackMapped = FALLBACK_HERO_BADGES.slice(mapped.length).map(b => ({
          id: b.id,
          image: b.img,
          category: b.cat,
        }));
        mapped.push(...fallbackMapped);
      }

      cachedHeroBadges = mapped.slice(0, 9);
      return cachedHeroBadges;
    } catch (err) {
      console.error('Failed to load hero badges, using fallback:', err);
      const fallbackResult: HeroBadgeItem[] = FALLBACK_HERO_BADGES.map(b => ({
        id: b.id,
        image: b.img,
        category: b.cat,
      }));
      cachedHeroBadges = fallbackResult;
      return cachedHeroBadges;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function getHeroBadges(): Promise<HeroBadgeItem[]> {
  return fetchHeroBadges();
}

export function getCachedHeroBadgesSync(): HeroBadgeItem[] | null {
  return cachedHeroBadges;
}

// Side-effect: kick off fetch immediately when module is imported
fetchHeroBadges();
