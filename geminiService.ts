
import { GoogleGenAI, Type } from "@google/genai";

// Initialize GoogleGenAI with the API key from environment variables.
// As per guidelines, we instantiate right before calling the API to ensure freshness.

export const generateBadgeMockup = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create a high-quality, professional sticker/badge design mockup for: ${prompt}. The style should be clean, vibrant, and modern, suitable for a product catalog. White border, die-cut style.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    let imageUrl = '';
    // Iterate through response parts to find the image data, as per nano banana series model responses.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    if (!imageUrl) throw new Error("No image generated");
    return imageUrl;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    // Fallback to a placeholder if API fails or key missing
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/512/512`;
  }
};

export const getBadgeDescription = async (name: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a 20-word catchy sales description for a badge named "${name}". Make it fun and appealing.`,
    });
    // Access the .text property directly, which is a getter (not a method).
    return response.text || "A high-quality badge that helps you wear your vibe!";
  } catch (error) {
    return "A premium die-cut sticker badge designed to show off your unique personality and style.";
  }
};
