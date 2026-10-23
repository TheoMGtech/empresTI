"use client";

import { createTRPCReact } from "@trpc/react-query";

import type { RouterAplicacao } from "@/server/api/raiz";

export const trpc = createTRPCReact<RouterAplicacao>();
