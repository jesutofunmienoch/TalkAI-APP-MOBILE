// lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY, // only this is needed
});

export default openai;
