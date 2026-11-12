const ORIGIN = "https://shiye-daily-reader.vercel.app";

const worker = {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(`${incoming.pathname}${incoming.search}`, ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ray");

    // Vercel forwards Server Actions with x-forwarded-host set to the Vercel
    // domain. Rewrite Origin to match so Next.js does not reject the action.
    headers.set("origin", ORIGIN);
    const referer = headers.get("referer");
    if (referer) {
      headers.set(
        "referer",
        referer.replace(incoming.origin, ORIGIN),
      );
    }

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const response = await fetch(target, init);
    const proxied = new Response(response.body, response);
    const location = proxied.headers.get("location");

    if (location) {
      const resolved = new URL(location, target);
      if (resolved.hostname === new URL(ORIGIN).hostname) {
        resolved.protocol = incoming.protocol;
        resolved.host = incoming.host;
      }
      proxied.headers.set("location", resolved.toString());
    }

    return proxied;
  },
};

export default worker;
