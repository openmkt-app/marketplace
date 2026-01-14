import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AISearchResponse } from "../types";

// Note: In a real production app, this should be proxied through a backend
// to avoid exposing the key, but for this demo environment we use process.env directly.

// Schema for the AI response
const searchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    keywords: {
      type: Type.STRING,
      description: "Extracted key search terms from the user query (e.g., 'bike', 'laptop').",
    },
    category: {
      type: Type.STRING,
      description: "The most likely category from the enum: 'Electronics', 'Garden & Outdoor', 'Home', 'Clothing', 'Vehicles', 'Other', or 'All'.",
    },
    minPrice: {
      type: Type.NUMBER,
      description: "Minimum price mentioned or implied (optional).",
    },
    maxPrice: {
      type: Type.NUMBER,
      description: "Maximum price mentioned or implied (optional).",
    },
    location: {
      type: Type.STRING,
      description: "Location mentioned in the query (optional).",
    },
    reasoning: {
      type: Type.STRING,
      description: "A short sentence explaining how you interpreted the query.",
    }
  },
  required: ["keywords", "category", "reasoning"]
};

export const parseNaturalLanguageQuery = async (query: string): Promise<AISearchResponse | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key found for Gemini");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // We use a lighter model for speed on this interactive feature
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `User Search Query: "${query}"
      
      Analyze this marketplace search query and extract structured filter data.
      If the user asks for "cheap", imply a maxPrice around 50.
      If they ask for "premium" or "expensive", imply a minPrice around 100.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: searchSchema,
        systemInstruction: "You are a smart search assistant for an online marketplace. Your job is to convert natural language into database filters."
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as AISearchResponse;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return null;
  }
};