import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? "us";

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }

  const configs: Record<string, string> = {
    us: `https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=20&apiKey=${apiKey}`,
    jp: `https://newsapi.org/v2/everything?q=経済 OR 株式 OR ビジネス&language=ja&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`,
    kr: `https://newsapi.org/v2/everything?q=경제 OR 주식 OR 비즈니스&language=ko&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`,
  };
  const url = configs[country] ?? configs.us;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message ?? "取得失敗" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "ネットワークエラー" }, { status: 500 });
  }
}
