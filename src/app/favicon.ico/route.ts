const FAVICON_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlGQAAAAASUVORK5CYII=",
  "base64"
);

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(FAVICON_PNG, {
    headers: {
      "cache-control": "public, max-age=86400",
      "content-type": "image/png"
    }
  });
}
