export interface TrendData {
  id: string;
  url: string;
  title: string;
  description?: string;
  platform: string;
  createdAt: string;
  metadata: {
    hashtags?: string[];
    [key: string]: any;
  };
}