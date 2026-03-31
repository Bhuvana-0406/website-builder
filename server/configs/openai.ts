import OpenAI from 'openai';

const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let retries = 5;
  let delay = 4000; 

  while (retries > 0) {
    const res = await fetch(url, init);
    if (res.status === 429 || res.status === 502) {
      console.warn(`OpenRouter rate limited (429/502). Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 1.5; 
      retries--;
    } else {
      return res;
    }
  }
  return fetch(url, init);
};

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
  maxRetries: 0, // We handle retries manually with our delay logic
  fetch: customFetch,
});

export default openai;