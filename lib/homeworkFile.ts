/**
 * A photo or PDF of homework done at home, made ready to send: photos are made smaller in the phone
 * (longest side 1600 px, JPEG) so a page stays readable but uploads quickly on a slow connection; PDFs go as
 * they are, up to 3.5 MB (the server's limit).
 */
const LONG_SIDE = 1600;
const MAX_PDF = 3.5 * 1024 * 1024;

export interface PickedFile {
  dataUrl: string;
  name: string;
  kind: "image" | "pdf";
}

const readAsDataUrl = (f: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(f);
  });

export async function prepareHomeworkFile(file: File): Promise<PickedFile> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    if (file.size > MAX_PDF) throw new Error("big-pdf");
    const url = await readAsDataUrl(file);
    return { dataUrl: url.replace(/^data:[^;]*;/, "data:application/pdf;"), name: file.name || "Homework.pdf", kind: "pdf" };
  }
  if (!file.type.startsWith("image/")) throw new Error("type");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file); // honours the phone's rotation
  } catch {
    throw new Error("type");
  }
  const scale = Math.min(1, LONG_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("type");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  let q = 0.82;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length > 1_400_000 && q > 0.45) {
    q -= 0.12;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return { dataUrl: out, name: (file.name || "Photo").replace(/\.[^.]+$/, "") + ".jpg", kind: "image" };
}
