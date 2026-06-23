import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? "us";

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }

  const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=business&pageSize=20&apiKey=${apiKey}`;

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
