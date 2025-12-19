
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  score: number; // 0-100
  description: string;
  category: 'speed' | 'ux' | 'seo' | 'security' | 'accessibility';
}

export interface DetailedAudit {
  id: string;
  title: string;
  score: number | null;
  description: string;
}

export interface PerformanceReport {
  id: string;
  url: string;
  timestamp: number;
  overallScore: number;
  metrics: PerformanceMetric[];
  seoAudits: DetailedAudit[];
  accessibilityAudits: DetailedAudit[];
  aiInsights: string;
  resourceBreakdown: {
    name: string;
    value: number;
    color: string;
  }[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING_AI = 'ANALYZING_AI',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
