import { NextRequest, NextResponse } from "next/server";

const LANG_MAP: Record<string, string> = {
  ja: "ja",
  ko: "ko",
  en: "en",
};

// 国コードからソース言語を決定
const COUNTRY_LANG: Record<string, string> = {
  jp: "ja",
  kr: "ko",
  us: "en",
};

export async function POST(request: NextRequest) {
  const { texts, targetLang, sourceLang } = await request.json();

  if (!texts || !targetLang) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  const target = LANG_MAP[targetLang] ?? "ja";
  const source = LANG_MAP[sourceLang] ?? "ja";

  // 元言語と翻訳先が同じなら翻訳不要
  if (source === target) {
    return NextResponse.json({ translated: texts });
  }

  try {
    const translated = await Promise.all(
      texts.map(async (text: string) => {
        if (!text) return text;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
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

export { COUNTRY_LANG };
