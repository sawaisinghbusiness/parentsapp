import { SCENE_PHOTOS } from "@/components/art";

export interface EventRow {
  id: string;
  title: string;
  date: string;
  upcoming: boolean;
  coverUrl?: string | null;
  /** Demo only: one of our stock photos instead of the school's own. */
  scene?: string | null;
  photoCount: number;
  videoCount: number;
}
export interface Photo {
  id: string;
  url: string | null;
  scene?: string | null;
  video?: boolean;
}
export interface Album extends EventRow {
  photos: Photo[];
}

/** Saves one picture to the phone: the school's file, or the demo photo for its scene. */
export async function savePhoto(p: Photo, name: string) {
  const href = p.url || (p.scene && SCENE_PHOTOS[p.scene]) || "";
  if (!href) return;
  const a = document.createElement("a");
  a.href = href;
  a.download = p.url ? name : `${name}.webp`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
