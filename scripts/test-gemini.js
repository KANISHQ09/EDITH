const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  console.log(`🔄 Testing Gemini API (${model})...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'You are an incident classifier. Classify this utterance: "Priya: Checkout API latency is 8.4s after v2.4.1 deploy". Return JSON with type (FACT, HYPOTHESIS, DECISION, ACTION_ITEM, QUESTION), confidence, and summary.'
          }]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        }
      })
    });

    const data = await res.json();
    if (data.error) {
      console.error('❌ Gemini API Error:', data.error);
      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Gemini Response:');
    console.log(text);
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testGemini();
