"use client";

import { useState, useEffect, useCallback } from "react";

type Article = {
  title: string;
  source: { name: string };
  publishedAt: string;
  url: string;
  urlToImage: string | null;
  description: string | null;
};

type Tab = { code: string; label: string; flag: string };
type LangOption = { code: string; label: string; flag: string };

const TABS: Tab[] = [
  { code: "jp", label: "日本", flag: "🇯🇵" },
  { code: "kr", label: "韓国", flag: "🇰🇷" },
  { code: "us", label: "アメリカ", flag: "🇺🇸" },
];

const COUNTRY_LANG: Record<string, string> = {
  jp: "ja",
  kr: "ko",
  us: "en",
};

const LANGS: LangOption[] = [
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function formatAnalysis(text: string) {
  const sections = text.split(/\n(?=\*\*①|\*\*②|\*\*③)/).filter(Boolean);
  if (sections.length < 2) return <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{text}</p>;

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const match = section.match(/^\*\*([^*]+)\*\*\n?([\s\S]*)/);
        if (!match) return <p key={i} className="text-xs text-gray-600 leading-relaxed">{section}</p>;
        const [, heading, body] = match;
        return (
          <div key={i}>
            <p className="text-[11px] font-semibold text-gray-800 mb-0.5">{heading}</p>
            <p className="text-xs text-gray-600 leading-relaxed">{body.trim()}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState("jp");
  const [articles, setArticles] = useState<Record<string, Article[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayLang, setDisplayLang] = useState("ja");
  const [translated, setTranslated] = useState<Record<string, Article[]>>({});
  const [translating, setTranslating] = useState(false);

  // AI分析の状態
  const [analysisCache, setAnalysisCache] = useState<Record<string, string>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<Record<string, boolean>>({});
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});

  const fetchNews = useCallback(async (country: string) => {
    if (articles[country]) return;
    setLoading((p) => ({ ...p, [country]: true }));
    try {
      const res = await fetch(`/api/news?country=${country}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取得失敗");
      setArticles((p) => ({ ...p, [country]: data.articles ?? [] }));
    } catch (e) {
      setErrors((p) => ({ ...p, [country]: (e as Error).message }));
    } finally {
      setLoading((p) => ({ ...p, [country]: false }));
    }
  }, [articles]);

  useEffect(() => { fetchNews(active); }, [active, fetchNews]);

  // 言語が変わったら翻訳
  useEffect(() => {
    const cacheKey = `${active}_${displayLang}`;
    if (translated[cacheKey]) return;
    const src = articles[active];
    if (!src || src.length === 0) return;

    setTranslating(true);
    const titles = src.map((a) => a.title);
    const descs = src.map((a) => a.description ?? "");

    Promise.all([
      fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: titles, targetLang: displayLang, sourceLang: COUNTRY_LANG[active] }) }).then((r) => r.json()),
      fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: descs, targetLang: displayLang, sourceLang: COUNTRY_LANG[active] }) }).then((r) => r.json()),
    ]).then(([titleRes, descRes]) => {
      const result = src.map((a, i) => ({
        ...a,
        title: titleRes.translated?.[i] ?? a.title,
        description: descRes.translated?.[i] || a.description,
      }));
      setTranslated((p) => ({ ...p, [cacheKey]: result }));
    }).catch(() => {
      setTranslated((p) => ({ ...p, [cacheKey]: src }));
    }).finally(() => setTranslating(false));
  }, [active, displayLang, articles, translated]);

  const handleAnalyze = useCallback(async (article: Article, key: string) => {
    if (expandedAnalysis[key] && analysisCache[key]) {
      setExpandedAnalysis((p) => ({ ...p, [key]: !p[key] }));
      return;
    }
    if (analysisCache[key]) {
      setExpandedAnalysis((p) => ({ ...p, [key]: true }));
      return;
    }

    setLoadingAnalysis((p) => ({ ...p, [key]: true }));
    setExpandedAnalysis((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: article.title, description: article.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "分析失敗");
      setAnalysisCache((p) => ({ ...p, [key]: data.analysis }));
    } catch (e) {
      setAnalysisCache((p) => ({ ...p, [key]: `エラー: ${(e as Error).message}` }));
    } finally {
      setLoadingAnalysis((p) => ({ ...p, [key]: false }));
    }
  }, [analysisCache, expandedAnalysis]);

  const cacheKey = `${active}_${displayLang}`;
  const current = translated[cacheKey] ?? articles[active] ?? [];
  const isLoading = loading[active];
  const error = errors[active];
  const isTranslating = translating && !translated[cacheKey];

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* トップバー */}
      <div className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xs tracking-widest uppercase font-medium text-gray-400">Economic News Dashboard</span>
          {/* 言語セレクター */}
          <div className="flex items-center gap-0 border border-gray-700">
            {LANGS.map((lang, i) => (
              <button
                key={lang.code}
                onClick={() => setDisplayLang(lang.code)}
                className={`px-3 py-1 text-xs font-medium tracking-wide transition-colors ${
                  displayLang === lang.code
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white"
                } ${i !== LANGS.length - 1 ? "border-r border-gray-700" : ""}`}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ヘッダー */}
      <header className="border-b border-gray-200 sticky top-0 z-10 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="py-5 border-b border-gray-100">
            <h1 className="text-2xl font-bold tracking-tight text-black">経済ニュースダッシュボード</h1>
            <p className="text-xs text-gray-500 mt-1 tracking-wide">日本・韓国・アメリカのビジネスニュース</p>
          </div>
          {/* タブ */}
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.code}
                onClick={() => setActive(tab.code)}
                className={`px-6 py-3 text-sm font-medium tracking-wide border-b-2 transition-colors ${
                  active === tab.code
                    ? "border-black text-black"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <span className="text-xs mr-1.5 text-gray-400">{tab.flag}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {(isLoading || isTranslating) && (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <svg className="animate-spin h-4 w-4 mr-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm tracking-wide">{isTranslating ? "翻訳中..." : "ニュースを取得中..."}</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
            ⚠️ {error}
          </div>
        )}

        {!isLoading && !isTranslating && !error && current.length === 0 && (
          <p className="text-center text-gray-400 py-24 text-sm tracking-wide">記事が見つかりませんでした</p>
        )}

        {!isTranslating && (
          <div className="divide-y divide-gray-100">
            {current.map((article, i) => {
              const articleKey = `${active}_${i}`;
              const isExpanded = expandedAnalysis[articleKey];
              const isAnalyzing = loadingAnalysis[articleKey];
              const analysis = analysisCache[articleKey];

              return (
                <div key={i} className="py-5">
                  {/* 記事メイン行 */}
                  <div className="flex gap-5 group">
                    {/* 連番 */}
                    <span className="text-xs text-gray-300 font-mono w-6 flex-shrink-0 pt-1 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* サムネイル */}
                    {article.urlToImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.urlToImage}
                        alt=""
                        className="w-24 h-16 object-cover flex-shrink-0 bg-gray-100 grayscale group-hover:grayscale-0 transition-all"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-24 h-16 flex-shrink-0 bg-gray-100" />
                    )}

                    {/* テキスト */}
                    <div className="flex-1 min-w-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 hover:underline underline-offset-2">
                          {article.title}
                        </h2>
                      </a>
                      {article.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {article.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">{article.source.name}</span>
                          <span className="text-gray-300">|</span>
                          <span>{timeAgo(article.publishedAt)}</span>
                        </div>
                        {/* AI分析ボタン */}
                        <button
                          onClick={() => handleAnalyze(article, articleKey)}
                          className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-medium tracking-wide border transition-colors ${
                            isExpanded
                              ? "border-black bg-black text-white"
                              : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {isAnalyzing ? (
                            <>
                              <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              分析中
                            </>
                          ) : (
                            <>
                              <span>✦</span>
                              AI分析
                              {isExpanded ? " ▲" : " ▼"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 矢印 */}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-black transition-colors text-lg flex-shrink-0 self-center"
                    >
                      →
                    </a>
                  </div>

                  {/* AI分析パネル */}
                  {isExpanded && (
                    <div className="mt-3 ml-[76px] border-l-2 border-black pl-4 pr-2">
                      {isAnalyzing && !analysis ? (
                        <p className="text-xs text-gray-400 py-2">AIが記事を分析中です...</p>
                      ) : analysis ? (
                        <div className="py-1">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-medium">AI Analysis</p>
                          {formatAnalysis(analysis)}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !isTranslating && current.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-10 tracking-widest uppercase">
            {current.length} Articles · Powered by NewsAPI & GNews
          </p>
        )}
      </main>
    </div>
  );
}
