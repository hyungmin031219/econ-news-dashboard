import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? "us";

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }

  const gnewsKey = process.env.GNEWS_KEY;

  const configs: Record<string, { url: string; useGnews: boolean }> = {
    us: { url: `https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=100&apiKey=${apiKey}`, useGnews: false },
    jp: { url: `https://gnews.io/api/v4/top-headlines?category=business&lang=ja&country=jp&max=20&apikey=${gnewsKey}`, useGnews: true },
    kr: { url: `https://newsapi.org/v2/everything?q=경제 OR 주식 OR 비즈니스&language=ko&sortBy=publishedAt&pageSize=100&apiKey=${apiKey}`, useGnews: false },
  };
  const config = configs[country] ?? configs.us;
  const url = config.url;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message ?? "取得失敗" }, { status: res.status });
    }
    const data = await res.json();

    // GNewsのレスポンスをNewsAPI形式に変換
    if (config.useGnews) {
      const articles = (data.articles ?? []).map((a: {
        title: string; description: string; url: string;
        image: string; publishedAt: string; source: { name: string };
      }) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        urlToImage: a.image,
        publishedAt: a.publishedAt,
        source: { name: a.source.name },
      }));
      return NextResponse.json({ articles });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "ネットワークエラー" }, { status: 500 });
  }
}
