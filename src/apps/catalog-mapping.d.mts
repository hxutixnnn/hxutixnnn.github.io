import type { AppDescriptor, ExternalTarget, IconName } from "./contract";

export type ExternalAppDescriptor = AppDescriptor & { target: ExternalTarget };

export type RepositoryInventoryItem = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  visibility: "public";
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  htmlUrl: string;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  updatedAt: string;
};

export type RepositoryCatalogConfig = {
  owner: string;
  displayOwner: string;
  excludedRepositories?: Record<string, string>;
  overrides?: Record<string, { id?: string; name?: string; summary?: string; icon?: IconName }>;
};

export type SocialProfile = { id: string; name: string; url: string; icon: IconName };

export function selectRepositoryLaunchUrl(repository: RepositoryInventoryItem): string;
export function mapRepositoriesToApps(
  repositories: readonly RepositoryInventoryItem[],
  config: RepositoryCatalogConfig,
): ExternalAppDescriptor[];
export function mapSocialProfilesToApps(
  profiles: readonly SocialProfile[],
  displayOwner: string,
): ExternalAppDescriptor[];
