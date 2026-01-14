import { MutationCtx, QueryCtx } from "./_generated/server";

export const verifyAuth = (ctx: QueryCtx | MutationCtx) => {
  const identity = ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized");
  }

  return identity;
};
