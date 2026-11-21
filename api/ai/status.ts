const POLLINATIONS_BASE_URL = (
  process.env.POLLINATIONS_BASE_URL?.trim() || "https://text.pollinations.ai"
).replace(/\/+$/, "");

const responseHeaders = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

export async function GET() {
  try {
    const response = await fetch(`${POLLINATIONS_BASE_URL}/models`, {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json" },
    });
    return Response.json({ available: response.ok }, { headers: responseHeaders });
  } catch {
    return Response.json({ available: false }, { headers: responseHeaders });
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...responseHeaders,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
