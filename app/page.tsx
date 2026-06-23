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

const TABS: Tab[] = [
  { code: "jp", label: "日本", flag: "🇯🇵" },
  { code: "kr", label: "韓国", flag: "🇰🇷" },
  { code: "us", label: "アメリカ", flag: "🇺🇸" },
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

  const current = articles[active] ?? [];
  const isLoading = loading[active];
  const error = errors[active];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">📊 経済ニュースダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">日本・韓国・アメリカのビジネスニュース</p>
        </div>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.code}
                onClick={() => setActive(tab.code)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active === tab.code
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.flag} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            ニュースを取得中…
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {!isLoading && !error && current.length === 0 && (
          <p className="text-center text-gray-400 py-20">記事が見つかりませんでした</p>
        )}

        <div className="space-y-3">
          {current.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex gap-4">
                {article.urlToImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.urlToImage}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-600 line-clamp-2">
                    {article.title}
                  </h2>
                  {article.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{article.source.name}</span>
                    <span>·</span>
                    <span>{timeAgo(article.publishedAt)}</span>
                    <span className="ml-auto text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      記事を読む →
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {!isLoading && current.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            {current.length}件の記事 · Powered by NewsAPI
          </p>
        )}
      </main>
    </div>
  );
}
