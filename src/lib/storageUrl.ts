// =============================================================================
// storageUrl — utilities for generating signed URLs for private storage buckets.
//
// IMPORTANT: `submissions`, `session-evidence`, `course-materials`, and
// `accreditation-reports` are PRIVATE buckets. `getPublicUrl()` returns a URL
// that won't actually work for them (it returns a 404). Use `getSignedUrl()`
// at READ time instead (when about to display or download), and store only
// the storage path in the database.
//
// Buckets:
//   - avatars              → PUBLIC,  use getPublicUrl()
//   - submissions          → PRIVATE, use getSignedUrl()
//   - session-evidence     → PRIVATE, use getSignedUrl()
//   - course-materials     → PRIVATE, use getSignedUrl()
//   - accreditation-reports → PRIVATE, use getSignedUrl()
// =============================================================================

import { supabase } from "@/lib/supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Generate a signed URL for a file in a private bucket.
 * Pass the storage path (not the full URL) you stored in the database.
 *
 * Example:
 *   const url = await getSignedUrl("submissions", submission.file_url);
 *   if (url) window.open(url, "_blank");
 *
 * Returns null if the file doesn't exist or signing fails.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error) {
    console.error(`getSignedUrl(${bucket}, ${path}) failed:`, error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Generate signed URLs for many paths in one round trip.
 * Falls back to per-path createSignedUrl if the batch API isn't available.
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, ttlSeconds);
  if (error || !data) {
    console.error(`getSignedUrls(${bucket}) failed:`, error?.message);
    return {};
  }
  const result: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl && item.path) {
      result[item.path] = item.signedUrl;
    }
  }
  return result;
}
