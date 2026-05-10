const r = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.CODEX_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-5-mini',
    input: 'Reply with just the word: ok',
  }),
});
const data = await r.json();
console.log('status:', r.status);
console.log('top-level keys:', Object.keys(data));
console.log('output_text:', data.output_text);
console.log('output length:', data.output?.length);
console.log('output:', JSON.stringify(data.output, null, 2).slice(0, 1500));
console.log('status:', data.status, 'incomplete_details:', JSON.stringify(data.incomplete_details));
