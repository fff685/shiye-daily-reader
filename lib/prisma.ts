import "server-only";
import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { configureNeonWebSocket } from "@/lib/neon-socket";

// Neon resolves to both IPv4 and IPv6. Some networks (including local
// development in this project) cannot reach the IPv6 endpoint, so prefer IPv4
// before the serverless driver opens its WebSocket connection.
setDefaultResultOrder("ipv4first");
configureNeonWebSocket();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  const isNeon = url?.includes("neon.tech");

  if (isNeon && url) {
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
