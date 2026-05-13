import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAdCopy(params: {
  businessName: string;
  category: string;
  description: string;
  price?: string;
  whatsapp?: string;
}) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Anda adalah seorang copywriter iklan profesional yang ahli dalam pemasaran UMKM lokal di Indonesia.
    Bantu buatkan caption promosi untuk usaha berikut:
    
    Nama Usaha: ${params.businessName}
    Kategori: ${params.category}
    Deskripsi: ${params.description}
    Harga: ${params.price || 'Tanya langsung'}
    WhatsApp: ${params.whatsapp || ''}

    Gaya bahasa: Santai, hangat, persuasif (menjual), dan emosional. Gunakan bahasa yang mudah dipahami warga kampung/desa.
    
    Format output harus JSON dengan field:
    1. fullCaption: Caption panjang untuk katalog/media sosial (dengan emoji)
    2. wsStatus: Versi singkat untuk Status WhatsApp (maksimalkan baris pertama agar menarik)
    3. hashtags: Daftar hashtag relevan
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullCaption: { type: Type.STRING },
          wsStatus: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["fullCaption", "wsStatus", "hashtags"]
      }
    }
  });

  return JSON.parse(response.text);
}
