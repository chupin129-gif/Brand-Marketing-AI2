export type Brand = 'hema' | 'samsong' | 'tmc' | 'makemysong';
export type ContentType = 'review' | 'information';

export interface BlogPostParams {
  brand: Brand;
  contentType: ContentType;
  mainKeyword: string;
  subKeywords: string;
  trendTopic?: string;
  musicTitle?: string;
  musicDescription?: string;
  stories: { priority: number; content: string }[];
  videoAssets?: VideoAssets;
  referenceLinks?: string[];
}

export interface KeywordTrendAnalysis {
  autocompleteKeywords: string[];
  relatedKeywords: string[];
  seasonalTrends: { tag: string; context: string }[];
  recommendedCombinations: {
    titleIdea: string;
    mainKeyword: string;
    subKeywords: string;
    trendTopic: string;
    reason: string;
  }[];
}

export interface VideoAssets {
  gif: string; // Base64 Data URL
  captures: string[]; // Array of Base64 Data URLs
}

export interface GeneratedBlog {
  titles: {
    standard: string;
    emotional: string;
    clickbait: string;
  };
  content: string;
  hashtags: string[];
  seoStrategy: string;
  referenceInfo?: string;
  attachedAssets?: VideoAssets;
  thumbnailUrl?: string;
  infographicUrl?: string;
}

export type Platform = 'naver' | 'wordpress' | 'tistory' | 'blogspot' | 'instagram' | 'threads' | 'eoplanet' | 'x';

export interface SeoTrend {
  summary: string;
  sources: { title: string; uri: string }[];
  timestamp: string;
  changes?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  FETCHING_TRENDS = 'FETCHING_TRENDS',
  PROCESSING_VIDEO = 'PROCESSING_VIDEO',
  GENERATING_CONTENT = 'GENERATING_CONTENT',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}