import { lookup } from "node:dns";
import WebSocket from "ws";
import { neonConfig } from "@neondatabase/serverless";

/**
 * Some networks cannot reach Neon's IPv6 endpoint. The default global
 * WebSocket resolves both families and may pick IPv6 first, so force IPv4 for
 * the WebSocket connection used by the Prisma Neon adapter.
 */
class Ipv4WebSocket extends WebSocket {
  constructor(address: string | URL, protocols?: string | string[]) {
    super(address, protocols, {
      lookup(hostname, options, callback) {
        lookup(hostname, { ...options, family: 4 }, callback);
      },
    });
  }
}

export function configureNeonWebSocket() {
  neonConfig.webSocketConstructor =
    Ipv4WebSocket as unknown as typeof globalThis.WebSocket;
}
