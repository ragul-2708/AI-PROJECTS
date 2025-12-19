
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Search, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Cpu, 
  History,
  Info,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Clock,
  XCircle,
  Sun,
  Moon,
  Check,
  X,
  Target,
  Accessibility,
  ExternalLink
} from 'lucide-react';
import { AnalysisStatus, PerformanceReport, PerformanceMetric } from './types';
import { getAiAuditReport } from './services/geminiService';
import { fetchLighthouseMetrics } from './services/lighthouseService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [history, setHistory] = useState<PerformanceReport[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'unhelpful' | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('lumina_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Initialize history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lumina_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // Sync theme with document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lumina_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lumina_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const validateUrl = (input: string) => {
    if (!input) return "Please enter a URL";
    
    const urlPattern = new RegExp(
      '^(https?:\\/\\/)?' + 
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + 
        '((\\d{1,3}\\.){3}\\d{1,3}))' + 
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + 
        '(\\?[;&a-z\\d%_.~+=-]*)?' + 
        '(\\#[-a-z\\d_]*)?$',
      'i'
    );

    if (!urlPattern.test(input)) {
      return "Please enter a valid website address (e.g., example.com)";
    }
    return "";
  };

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }

    setUrlError('');
    setApiError(null);
    setFeedbackGiven(null);
    setStatus(AnalysisStatus.SCANNING);
    setLoadingPhase('Connecting to Lighthouse... (usually takes 10-15s)');
    
    try {
      // 1. Fetch real Lighthouse metrics
      const { metrics, seoAudits, accessibilityAudits, overallScore, resourceBreakdown } = await fetchLighthouseMetrics(url);
      
      setStatus(AnalysisStatus.ANALYZING_AI);
      setLoadingPhase('Gemini 3 is auditing performance results...');
      
      // 2. Get AI Insights based on real data
      const aiInsights = await getAiAuditReport(url, metrics);
      
      const newReport: PerformanceReport = {
        id: Date.now().toString(),
        url: url.startsWith('http') ? url : `https://${url}`,
        timestamp: Date.now(),
        metrics,
        seoAudits,
        accessibilityAudits,
        overallScore,
        aiInsights,
        resourceBreakdown
      };

      setReport(newReport);
      const updatedHistory = [newReport, ...history.filter(h => h.url !== newReport.url)].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem('lumina_history', JSON.stringify(updatedHistory));
      setStatus(AnalysisStatus.COMPLETED);
    } catch (err: any) {
      console.error("Analysis Failed:", err);
      setApiError(err.message || "An unexpected error occurred during analysis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (urlError) setUrlError('');
    if (apiError) setApiError(null);
  };

  const handleFeedback = (type: 'helpful' | 'unhelpful') => {
    setFeedbackGiven(type);
    console.log(`Feedback received: ${type} for report ${report?.id}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-500/20';
    if (score >= 50) return 'bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-500/20';
    return 'bg-rose-50 dark:bg-rose-400/10 border-rose-200 dark:border-rose-500/20';
  };

  const parseDescription = (desc: string) => {
    const parts = desc.split('[Learn more](');
    const cleanedDesc = parts[0].trim();
    const learnMoreUrl = parts[1] ? parts[1].split(')')[0] : null;
    return { cleanedDesc, learnMoreUrl };
  };

  const isScanning = status === AnalysisStatus.SCANNING || status === AnalysisStatus.ANALYZING_AI;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Zap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Lumina Performance
            </h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              <a href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Docs</a>
              <a href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">History</a>
            </nav>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-12">
          <form onSubmit={handleRunAnalysis} className="relative max-w-3xl mx-auto group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Globe className={`h-5 w-5 transition-colors ${urlError || apiError ? 'text-rose-500' : 'text-slate-400'}`} />
            </div>
            <input
              type="text"
              className={`block w-full pl-12 pr-40 py-4 bg-white dark:bg-slate-900 border rounded-2xl focus:ring-2 transition-all outline-none text-lg shadow-xl ${
                urlError || apiError
                  ? 'border-rose-500/50 focus:ring-rose-500/50 ring-2 ring-rose-500/20' 
                  : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500 focus:border-transparent'
              }`}
              placeholder="Enter website URL (e.g. google.com)"
              value={url}
              onChange={handleInputChange}
              disabled={isScanning}
            />
            <button
              type="submit"
              disabled={isScanning}
              className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
            >
              {isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              {isScanning ? 'Processing...' : 'Analyze'}
            </button>
            
            {urlError && (
              <div className="absolute -bottom-7 left-2 flex items-center gap-1.5 text-rose-500 dark:text-rose-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                {urlError}
              </div>
            )}
          </form>

          {isScanning && (
            <div className="mt-8 max-w-lg mx-auto text-center space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>{loadingPhase}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div className="h-full bg-indigo-600 animate-progress rounded-full" />
              </div>
              <p className="text-xs text-slate-500 italic">Real performance testing can take up to 30 seconds for complex sites.</p>
            </div>
          )}
          
          {status === AnalysisStatus.ERROR && apiError && (
            <div className="mt-8 max-w-lg mx-auto p-4 bg-rose-50 dark:bg-rose-400/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl animate-in fade-in zoom-in-95 shadow-sm">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Analysis Failed</h4>
                  <p className="text-sm text-slate-700 dark:text-rose-200/80 leading-relaxed">
                    {apiError}
                  </p>
                  <button 
                    onClick={() => handleRunAnalysis()}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 underline mt-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {status === AnalysisStatus.IDLE && !report && (
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { icon: Zap, title: "Lighthouse Core", desc: "Powered by the same technology as Chrome DevTools." },
              { icon: ShieldCheck, title: "AI-Driven Audits", desc: "Actionable summaries generated by Gemini 3 Flash." },
              { icon: Cpu, title: "Real Data", desc: "No mocks. Genuine metrics from the Google PageSpeed API." }
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 transition-all group shadow-sm">
                <div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600/10 transition-colors">
                  <feature.icon className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-50">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}

        {report && !isScanning && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid md:grid-cols-4 gap-6">
              <div className={`col-span-1 p-8 rounded-3xl border flex flex-col items-center justify-center text-center shadow-lg transition-colors ${getScoreBg(report.overallScore)}`}>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Overall Score</span>
                <div className={`text-7xl font-black mb-1 ${getScoreColor(report.overallScore)}`}>
                  {report.overallScore}
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-full px-2 font-medium" title={report.url}>{report.url}</span>
              </div>

              <div className="col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                    Live Metrics
                  </h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    Captured: {new Date(report.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {report.metrics.map((m, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-tight">
                        {m.name}
                        <span title={m.description}>
                          <Info className="w-3 h-3 cursor-help opacity-50 hover:opacity-100 transition-opacity" />
                        </span>
                      </div>
                      <div className={`text-2xl font-mono font-bold ${getScoreColor(m.score)}`}>
                        {m.value}{m.unit}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${m.score >= 90 ? 'bg-emerald-500' : m.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced SEO Breakdown Section */}
              <div className="col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Target className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                    SEO Breakdown
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {report.seoAudits.map((audit) => {
                    const { cleanedDesc, learnMoreUrl } = parseDescription(audit.description);
                    const isPassed = audit.score === 100;
                    return (
                      <div key={audit.id} className={`p-6 rounded-2xl border transition-all flex flex-col h-full ${
                        isPassed 
                          ? 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800' 
                          : 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'
                      }`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {audit.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isPassed 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                              }`}>
                                {isPassed ? 'Optimized' : 'High Impact'}
                              </span>
                              {!isPassed && (
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`shrink-0 p-2 rounded-xl ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {isPassed ? <Check className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                          {cleanedDesc}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                          <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isPassed ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${audit.score || 0}%` }}
                              />
                            </div>
                            <span className={`text-xs font-black ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {audit.score}%
                            </span>
                          </div>
                          
                          {learnMoreUrl && (
                            <a 
                              href={learnMoreUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                            >
                              Learn more <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Accessibility Breakdown Section */}
              <div className="col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Accessibility className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                    Accessibility Breakdown
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {report.accessibilityAudits.map((audit) => (
                    <div key={audit.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{audit.title}</h4>
                        <div className={`shrink-0 p-1 rounded-full ${audit.score === 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {audit.score === 100 ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2" title={audit.description}>
                        {audit.description.replace(/\[Learn more\].*/, '')}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${audit.score === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${audit.score || 0}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${audit.score === 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {audit.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 relative overflow-hidden group shadow-xl transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity pointer-events-none">
                    <Zap className="w-32 h-32 text-indigo-600 dark:text-indigo-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <Zap className="text-white w-4 h-4" />
                    </div>
                    Gemini AI Technical Audit
                  </h3>
                  <div className="prose prose-slate dark:prose-invert max-w-none relative z-10">
                    {report.aiInsights.split('\n').map((line, i) => (
                      <p key={i} className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed whitespace-pre-line text-sm md:text-base">
                        {line}
                      </p>
                    ))}
                  </div>

                  <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Was this audit helpful?</p>
                    <div className="flex items-center gap-2">
                      {feedbackGiven === null ? (
                        <>
                          <button 
                            onClick={() => handleFeedback('helpful')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl transition-all text-sm font-medium shadow-sm"
                          >
                            <ThumbsUp className="w-4 h-4" /> Helpful
                          </button>
                          <button 
                            onClick={() => handleFeedback('unhelpful')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition-all text-sm font-medium shadow-sm"
                          >
                            <ThumbsDown className="w-4 h-4" /> Not helpful
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in-95 duration-300">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Thank you for your feedback!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl transition-colors">
                  <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-50">Network Payload</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.resourceBreakdown}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {report.resourceBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            color: isDark ? '#f8fafc' : '#1e293b'
                          }}
                          itemStyle={{ color: isDark ? '#f8fafc' : '#1e293b' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {report.resourceBreakdown.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                          {r.name}
                        </div>
                        <span className="font-mono text-slate-900 dark:text-slate-300 font-bold">{r.value} KB</span>
                      </div>
                    ))}
                  </div>
                </div>

                {history.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl transition-colors">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-50">
                      <History className="w-5 h-5 text-slate-400" />
                      Recent Reports
                    </h3>
                    <div className="space-y-4">
                      {history.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => {
                            setReport(h);
                            setFeedbackGiven(null);
                            setApiError(null);
                            setUrl(h.url);
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-slate-700 text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate w-32">{h.url.replace('https://', '')}</span>
                            <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className={`text-sm font-bold ${getScoreColor(h.overallScore)}`}>
                            {h.overallScore}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="text-indigo-600 dark:text-indigo-500 w-5 h-5" />
            <span className="text-sm text-slate-500 dark:text-slate-500 font-medium">© 2024 Lumina Performance Suite. Powered by Lighthouse & Gemini.</span>
          </div>
          <div className="flex gap-8 text-xs font-medium text-slate-400 dark:text-slate-600">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-slate-400 transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-slate-400 transition-colors">Open Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
