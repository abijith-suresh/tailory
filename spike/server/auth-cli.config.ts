// Only for `npx auth generate`: same options, no live database.
import { betterAuth } from "better-auth";
import { authOptions } from "./src/server/auth-options";

export const auth = betterAuth(authOptions({}));
