import type { Instrumentation } from "next";
import { reportServerError } from "@/lib/observability";

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportServerError("next.request_failed", error, {
    method: request.method,
    path: request.path,
    route: context.routePath,
    routeType: context.routeType,
  });
};
