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

/**
 * Saves one picture to the phone: the school's file, or the demo photo for its scene.
 * A `download` link is ignored for another site's file (the school's photos are on storage, not this app),
 * so the picture is fetched first and saved from the phone's own copy; where the storage doesn't allow that,
 * it opens in a new tab rather than replacing the app (audit 2026-11-16).
 */
export async function savePhoto(p: Photo, name: string) {
  const href = p.url || (p.scene && SCENE_PHOTOS[p.scene]) || "";
  if (!href) return;
  const fileName = p.url ? name : `${name}.webp`;
  const click = (url: string, download: boolean) => {
    const a = document.createElement("a");
    a.href = url;
    if (download) a.download = fileName;
    else a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const sameSite = new URL(href, window.location.href).origin === window.location.origin;
  if (sameSite) return click(href, true);
  try {
    const res = await fetch(href, { mode: "cors" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    // On a phone the share sheet has "Save image"; elsewhere the browser saves the file.
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        // The parent closed the sheet: done. Any other refusal (e.g. the tap was too long ago): save instead.
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    click(url, true);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch {
    click(href, false);
  }
}
