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

export default function Home() {
  const [active, setActive] = useState("jp");
  const [articles, setArticles] = useState<Record<string, Article[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [displayLang, setDisplayLang] = useState("ja");
  const [translated, setTranslated] = useState<Record<string, Article[]>>({});
  const [translating, setTranslating] = useState(false);

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
            {current.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-5 py-5 group hover:bg-gray-50 transition-colors -mx-4 px-4"
              >
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
                  <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:underline underline-offset-2">
                    {article.title}
                  </h2>
                  {article.description && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">{article.source.name}</span>
                    <span className="text-gray-300">|</span>
                    <span>{timeAgo(article.publishedAt)}</span>
                  </div>
                </div>

                {/* 矢印 */}
                <span className="text-gray-300 group-hover:text-black transition-colors text-lg flex-shrink-0 self-center">→</span>
              </a>
            ))}
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
