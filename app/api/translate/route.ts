import { generateText } from "ai"

export async function POST(req: Request) {
  const { texts, targetLocale } = await req.json()

  if (
    !texts ||
    !Array.isArray(texts) ||
    texts.length === 0 ||
    !targetLocale
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  // Batch translate up to 50 keys at once for efficiency
  const batch = texts.slice(0, 50) as { key: string; text: string }[]

  const prompt = `You are a professional translator for a German real estate investment platform called "Immonator".
Translate the following UI strings from ${targetLocale === "de" ? "English to German" : "German to English"}.

Keep these rules:
- Keep technical real estate terms like "Ertragswert", "Sachwert", "Bodenrichtwert", "AfA", "GrESt" unchanged
- Keep brand name "Immonator" unchanged
- Keep emoji/unicode symbols unchanged
- Keep placeholder tokens like {0}, {1} unchanged
- Use formal German "Sie" form, not informal "du"
- Return ONLY valid JSON, no markdown code blocks

Input JSON:
${JSON.stringify(
  batch.reduce(
    (acc, item) => {
      acc[item.key] = item.text
      return acc
    },
    {} as Record<string, string>
  ),
  null,
  2
)}

Return a JSON object with the same keys and translated values.`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.2,
      maxOutputTokens: 4000,
    })

    // Parse the response, stripping any markdown code blocks
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim()
    const translated = JSON.parse(cleaned)

    return Response.json({ translations: translated })
  } catch (error) {
    console.error("Translation error:", error)
    return Response.json(
      { error: "Translation failed" },
      { status: 500 }
    )
  }
}
