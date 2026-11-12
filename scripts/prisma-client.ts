import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { configureNeonWebSocket } from "../lib/neon-socket";

setDefaultResultOrder("ipv4first");
configureNeonWebSocket();

export function createScriptPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (url?.includes("neon.tech")) {
    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString: url }),
    });
  }

  return new PrismaClient();
}
