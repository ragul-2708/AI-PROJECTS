
import { GoogleGenAI, Type } from "@google/genai";
import { PerformanceMetric } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiAuditReport = async (url: string, metrics: PerformanceMetric[]) => {
  const metricsSummary = metrics.map(m => `${m.name}: ${m.value}${m.unit} (Score: ${m.score})`).join('\n');
  
  const prompt = `
    Analyze the following performance metrics for the website: ${url}
    
    Metrics Data:
    ${metricsSummary}
    
    Provide a detailed, professional, and actionable audit report.
    Structure the response with:
    1. A summary of overall site health.
    2. Critical Bottlenecks (Focus on Largest Contentful Paint or TBT).
    3. Specific Technical Recommendations (e.g., Image optimization, Gzip, JS minification).
    4. Strategic SEO/UX improvements.
    
    Keep the tone expert, concise, and helpful for a senior web developer.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "Unable to generate AI insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI insights. Please check your connectivity and try again.";
  }
};
