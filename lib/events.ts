import { SCENES } from "@/components/art";

export interface EventRow {
  id: string;
  title: string;
  date: string;
  upcoming: boolean;
  coverUrl?: string | null;
  /** Demo only: one of our drawn scenes instead of a photo. */
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

/** Saves one picture to the phone: the school's file, or the drawn scene as an SVG. */
export async function savePhoto(p: Photo, name: string) {
  let href = p.url || "";
  let made = false;
  if (!href && p.scene && SCENES[p.scene]) {
    href = URL.createObjectURL(new Blob([SCENES[p.scene]], { type: "image/svg+xml" }));
    made = true;
  }
  if (!href) return;
  const a = document.createElement("a");
  a.href = href;
  a.download = p.url ? name : `${name}.svg`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (made) setTimeout(() => URL.revokeObjectURL(href), 2000);
}
