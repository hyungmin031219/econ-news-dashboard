import { NextRequest, NextResponse } from "next/server";

const LANG_MAP: Record<string, string> = {
  ja: "ja",
  ko: "ko",
  en: "en",
};

export async function POST(request: NextRequest) {
  const { texts, targetLang } = await request.json();

  if (!texts || !targetLang) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  const target = LANG_MAP[targetLang] ?? "ja";

  try {
    const translated = await Promise.all(
      texts.map(async (text: string) => {
        if (!text) return text;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${target}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.responseData?.translatedText ?? text;
      })
    );
    return NextResponse.json({ translated });
  } catch {
    return NextResponse.json({ error: "翻訳エラー" }, { status: 500 });
  }
}
