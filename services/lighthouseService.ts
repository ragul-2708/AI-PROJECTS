
import { PerformanceMetric, DetailedAudit } from "../types";

const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Helper to wait for a specific amount of time.
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches data from the PageSpeed Insights API with aggressive exponential backoff and jitter.
 * 429 errors often require significantly longer wait times for anonymous or shared-key environments.
 */
async function fetchWithRetry(url: string, retries = 7, initialBackoff = 4000): Promise<Response> {
  let lastError: Error | null = null;
  let currentBackoff = initialBackoff;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - wait and retry with jittered exponential backoff
        lastError = new Error(`The Google PageSpeed API is currently under heavy load (429). Attempt ${i + 1} of ${retries} failed.`);
        
        if (i < retries - 1) {
          // Add random jitter to prevent "thundering herd" effect
          const jitter = Math.random() * 2000;
          const waitTime = currentBackoff + jitter;
          
          console.warn(`Rate limited (429) on attempt ${i + 1}. Retrying in ${Math.round(waitTime)}ms...`);
          await sleep(waitTime);
          
          // Use a steeper backoff for 429s
          currentBackoff *= 2.5; 
          continue;
        }
      } else {
        // Not a 429, return the response
        return response;
      }
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await sleep(currentBackoff);
        currentBackoff *= 2;
        continue;
      }
    }
  }
  
  throw lastError || new Error("Connection failed after multiple attempts.");
}

export const fetchLighthouseMetrics = async (url: string): Promise<{ metrics: PerformanceMetric[], seoAudits: DetailedAudit[], accessibilityAudits: DetailedAudit[], overallScore: number, resourceBreakdown: any[] }> => {
  // Clean the URL
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }
  
  // Construct parameters
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  params.append("category", "PERFORMANCE");
  params.append("category", "SEO");
  params.append("category", "ACCESSIBILITY");
  params.append("category", "BEST_PRACTICES");
  params.set("strategy", "mobile");

  // CRITICAL: Attach API Key if available to significantly increase rate limits
  if (process.env.API_KEY) {
    params.set("key", process.env.API_KEY);
  }
  
  const fullUrl = `${PAGESPEED_API_URL}?${params.toString()}`;

  try {
    const response = await fetchWithRetry(fullUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `Status: ${response.status}`;
      
      if (response.status === 400) {
        throw new Error(`Bad Request: ${message}. Ensure the URL is valid and public.`);
      } else if (response.status === 403) {
        throw new Error("Access Forbidden: Google's crawlers might be blocked, or the API key is restricted.");
      } else if (response.status === 429) {
        throw new Error("Maximum rate limit reached. The Google PageSpeed API is extremely congested. Please wait 2-3 minutes and try again.");
      }
      throw new Error(`PageSpeed API Error: ${message}`);
    }

    const data = await response.json();
    
    if (!data.lighthouseResult) {
      throw new Error("Analysis engine failed to return results. This often happens with sites that use heavy bot protection.");
    }

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;
    const categories = lighthouse.categories;

    // Map Lighthouse audits to our PerformanceMetric format
    const metrics: PerformanceMetric[] = [
      {
        name: 'First Contentful Paint',
        value: parseFloat((audits['first-contentful-paint']?.numericValue / 1000).toFixed(2)) || 0,
        unit: 's',
        score: Math.round((audits['first-contentful-paint']?.score || 0) * 100),
        category: 'speed',
        description: audits['first-contentful-paint']?.description || 'FCP measures how long it takes for the browser to render the first piece of DOM content.'
      },
      {
        name: 'Largest Contentful Paint',
        value: parseFloat((audits['largest-contentful-paint']?.numericValue / 1000).toFixed(2)) || 0,
        unit: 's',
        score: Math.round((audits['largest-contentful-paint']?.score || 0) * 100),
        category: 'speed',
        description: audits['largest-contentful-paint']?.description || 'LCP marks the point in the page load timeline when the main content has likely loaded.'
      },
      {
        name: 'Total Blocking Time',
        value: Math.round(audits['total-blocking-time']?.numericValue || 0),
        unit: 'ms',
        score: Math.round((audits['total-blocking-time']?.score || 0) * 100),
        category: 'speed',
        description: audits['total-blocking-time']?.description || 'TBT measures the total amount of time that a page is blocked from responding to user input.'
      },
      {
        name: 'Cumulative Layout Shift',
        value: parseFloat((audits['cumulative-layout-shift']?.numericValue || 0).toFixed(3)),
        unit: '',
        score: Math.round((audits['cumulative-layout-shift']?.score || 0) * 100),
        category: 'ux',
        description: audits['cumulative-layout-shift']?.description || 'CLS measures the sum total of all individual layout shift scores for every unexpected layout shift.'
      },
      {
        name: 'SEO Score',
        value: Math.round((categories['seo']?.score || 0) * 100),
        unit: '',
        score: Math.round((categories['seo']?.score || 0) * 100),
        category: 'seo',
        description: 'Lighthouse SEO audit score based on search engine optimization best practices.'
      },
      {
        name: 'Accessibility Score',
        value: Math.round((categories['accessibility']?.score || 0) * 100),
        unit: '',
        score: Math.round((categories['accessibility']?.score || 0) * 100),
        category: 'accessibility',
        description: 'Evaluates how accessible your website is for people with disabilities or impairments.'
      }
    ];

    // Extract detailed SEO audits
    const seoAuditIds = ['viewport', 'document-title', 'meta-description', 'image-alt', 'link-text', 'http-status-code', 'is-crawlable'];
    const seoAudits: DetailedAudit[] = seoAuditIds.map(id => {
      const audit = audits[id];
      return {
        id,
        title: audit?.title || id,
        score: audit?.score !== undefined ? Math.round(audit.score * 100) : null,
        description: audit?.description || ''
      };
    }).filter(a => a.score !== null);

    // Extract detailed accessibility audits
    const accessibilityAuditIds = ['color-contrast', 'document-title', 'html-has-lang', 'image-alt', 'label', 'link-name', 'list', 'listitem'];
    const accessibilityAudits: DetailedAudit[] = accessibilityAuditIds.map(id => {
      const audit = audits[id];
      return {
        id,
        title: audit?.title || id,
        score: audit?.score !== undefined ? Math.round(audit.score * 100) : null,
        description: audit?.description || ''
      };
    }).filter(a => a.score !== null);

    const overallScore = Math.round((categories['performance']?.score || 0) * 100);

    // Extract resource breakdown
    const resourceSummary = audits['resource-summary']?.details?.items || [];
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b', '#ec4899'];
    
    const resourceBreakdown = resourceSummary
      .filter((item: any) => item.resourceType !== 'total')
      .map((item: any, idx: number) => ({
        name: item.label,
        value: Math.round(item.transferSize / 1024), // to KB
        color: colors[idx % colors.length]
      }))
      .slice(0, 6);

    return {
      metrics,
      seoAudits,
      accessibilityAudits,
      overallScore,
      resourceBreakdown: resourceBreakdown.length > 0 ? resourceBreakdown : [
        { name: 'Assets', value: Math.round((audits['total-byte-weight']?.numericValue || 0) / 1024) || 0, color: '#3b82f6' }
      ]
    };
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Network connectivity issue: Unable to reach Google's PageSpeed servers. Check your connection or VPN settings.");
    }
    throw error;
  }
};
