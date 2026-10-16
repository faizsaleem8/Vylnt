import type { Report } from './index';

export interface ScanSummary {
  scanId: string; url: string; scannedAt: string; score: number; findingCount: number; highCount: number;
  coverage: { headers: boolean; dom: boolean; cookies: boolean }; hash: string; receivedAt: string;
}
export interface PageRequest { page: number; limit: number }
export interface ScanPage extends PageRequest { scans: ScanSummary[]; total: number }
export interface SiteSummary { origin: string; scanCount: number; latest: ScanSummary }
export interface SitePage extends PageRequest {
  sites: SiteSummary[]; total: number;
  overview: { latestHigh: number; averageScore: number | null };
}
export const summarizeScan = ({ report, hash, receivedAt }: { report: Report; hash: string; receivedAt: string }): ScanSummary => ({
  scanId: report.scanId, url: report.observation.url, scannedAt: report.observation.scannedAt,
  score: report.score, findingCount: report.findings.length,
  highCount: report.findings.filter(f => f.severity === 'high' || f.severity === 'critical').length,
  coverage: { headers: report.observation.headers !== undefined, dom: report.observation.domCollected, cookies: report.observation.cookies !== undefined },
  hash, receivedAt
});
