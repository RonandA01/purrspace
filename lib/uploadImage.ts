import imageCompression from "browser-image-compression";
import { supabase } from "./supabase";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

/**
 * Compress + upload an image to the post-media bucket.
 * Returns the public URL on success.
 */
export async function uploadPostImage(
  file: File,
  userId: string
): Promise<string> {
  // 1. Client-side compression
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);

  // 2. Unique path: <userId>/<timestamp>.<ext>
  const ext = compressed.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  // 3. Upload
  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });

  if (error) throw error;

  // 4. Return public URL
  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return data.publicUrl;
}
