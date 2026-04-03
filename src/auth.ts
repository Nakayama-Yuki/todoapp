import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const hasGitHubCredentials =
  Boolean(process.env.AUTH_GITHUB_ID) &&
  Boolean(process.env.AUTH_GITHUB_SECRET);

export const isAuthEnabled = hasGitHubCredentials;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" || process.env.CI === "true",
  secret: process.env.AUTH_SECRET,
  providers: hasGitHubCredentials ? [GitHub] : [],
});
