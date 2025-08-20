declare module 'google-trends-api' {
  interface TrendsOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
    timezone?: number;
    category?: number;
    property?: string;
    resolution?: string;
    granularTimeResolution?: boolean;
  }

  interface TimelineData {
    time: string;
    formattedTime: string;
    formattedAxisTime: string;
    value: number[];
    hasData: boolean[];
    isPartial: boolean;
  }

  interface TrendsResult {
    default: {
      timelineData: TimelineData[];
      averages: number[];
    };
  }

  interface RelatedQuery {
    query: string;
    value: number;
  }

  interface RelatedQueriesResult {
    default: {
      rankedList: Array<{
        rankedKeyword: RelatedQuery[];
      }>;
    };
  }

  export function interestOverTime(options: TrendsOptions): Promise<string>;
  export function relatedQueries(options: TrendsOptions): Promise<string>;
  export function relatedTopics(options: TrendsOptions): Promise<string>;
  export function interestByRegion(options: TrendsOptions): Promise<string>;
  export function realTimeTrends(options: { geo: string; category?: string; }): Promise<string>;
  export function dailyTrends(options: { geo: string; trendDate?: Date; }): Promise<string>;
}