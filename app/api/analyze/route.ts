import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { title, description } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "タイトルが必要です" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }

  const prompt = `以下のニュース記事を分析してください。

タイトル: ${title}
概要: ${description ?? "なし"}

以下の3点について、それぞれ2〜3文で簡潔に日本語で回答してください：

**① 社会への影響**
この記事が示す出来事が社会全体に与える可能性のある影響を述べてください。

**② 株式市場・経済への影響**
この記事の内容が株式市場や経済に与える可能性のある影響（上昇・下落リスク、投資家心理など）を述べてください。

**③ 注目セクター・銘柄**
この記事の影響を受けやすいと考えられる業界・セクター・企業カテゴリを挙げてください。`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ analysis: text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "分析に失敗しました" }, { status: 500 });
  }
}
