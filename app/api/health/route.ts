export async function GET() {
  return Response.json({
    ok: true,
    service: "shiye-daily-reader",
    timestamp: new Date().toISOString(),
  });
}
