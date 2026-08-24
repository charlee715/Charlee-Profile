import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const [repositoryOwner = "charlee715", repositoryName = "Charlee-Profile"] =
  (process.env.GITHUB_REPOSITORY ?? "charlee715/Charlee-Profile").split("/");
const isUserSite = repositoryName.toLowerCase() === `${repositoryOwner}.github.io`.toLowerCase();
const pagesBasePath = isGitHubPages && !isUserSite ? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  assetPrefix: pagesBasePath,
  trailingSlash: isGitHubPages,
  env: {
    NEXT_PUBLIC_BASE_PATH: pagesBasePath,
  },
};

export default nextConfig;
