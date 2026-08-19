export interface HeroBadge {
  id: string;
  name: string;
  image: string;
  category: string;
}

export const HERO_BADGES: HeroBadge[] = [
  { id: "pet-1", name: "Best Friends", image: "/images/a.png", category: "pet" },
  { id: "spiritual-1", name: "Spiritual Om Ganesha", image: "/images/h.png", category: "religious" },
  { id: "moody-1", name: "Star Eyes", image: "/images/b.png", category: "moody" },
  { id: "event-1", name: "India Flag Culture", image: "/images/flag2.png", category: "events" },
  { id: "ent-1", name: "Film Buff Movie", image: "/images/d.png", category: "entertainment" },
  { id: "couple-1", name: "Soul Mates Couple", image: "/images/e.png", category: "couple" },
  { id: "anime-1", name: "My Hero Academia", image: "/images/f.png", category: "anime" },
  { id: "event-5", name: "Birthday Girl", image: "/images/g.png", category: "events" },
  { id: "anime-2", name: "Anime Eye", image: "/images/c.png", category: "anime" },
];
