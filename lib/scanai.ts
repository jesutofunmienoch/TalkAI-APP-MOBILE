// lib/scanai.ts
import openai from './openai';
import * as FileSystem from 'expo-file-system/legacy';

export async function scanImage(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze the image and solve the question in it step by step. Use markdown format for the response. For all mathematical expressions, use proper LaTeX syntax (e.g., \\frac{1}{2} for fractions, \\sqrt{x} for square roots, no ASCII shorthand like frac or sqrt). Always wrap inline math in single dollars $...$ and display math in double dollars $$...$$.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      },
    ],
  });

  return completion.choices[0].message.content || 'No response';
}