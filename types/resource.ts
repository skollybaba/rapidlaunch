export const RESOURCE_TYPES = ["ARTICLE", "VIDEO"] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export interface ResourceDoc {
  _id?: unknown;
  type: ResourceType;
  title: string;
  slug: string;
  summary?: string;
  contentHtml?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PublicResource {
  id: string;
  type: ResourceType;
  title: string;
  slug: string;
  summary?: string;
  contentHtml?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  published: boolean;
  createdAt?: string;
}
