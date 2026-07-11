import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Init ─────────────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

if (!apiKey) {
  console.warn('[RainReady] GEMINI_API_KEY not set. AI features will use offline fallbacks.');
}

// ─── Safe JSON Parse ──────────────────────────────────────────────────────────
/**
 * Safely parse Gemini's text response as JSON.
 * Strips markdown code fences if present. Returns null on failure.
 */
const safeJsonParse = <T>(text: string): T | null => {
  try {
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
};

// ─── Fallback Databases ───────────────────────────────────────────────────────
const FALLBACK_PLANS: Record<'high' | 'moderate' | 'low', any> = {
  high: {
    riskLevel: 'high',
    checklist: [
      { id: 'c1', item: 'Packaged Drinking Water (20 Litres)', category: 'Survival', quantity: '0', requiredQuantity: '20L', completed: false },
      { id: 'c2', item: 'Waterproof First-Aid & Emergency Meds', category: 'Medical', quantity: '0', requiredQuantity: '1 kit', completed: false },
      { id: 'c3', item: 'Fully charged 20000mAh Power Banks', category: 'Power', quantity: '0', requiredQuantity: '2 units', completed: false },
      { id: 'c4', item: 'Dry food (biscuits, dry fruits, roasted chana)', category: 'Survival', quantity: '0', requiredQuantity: '3 days', completed: false },
      { id: 'c5', item: 'Heavy-duty flashlight and spare batteries', category: 'Safety', quantity: '0', requiredQuantity: '2 units', completed: false },
      { id: 'c6', item: 'Important documents in waterproof pouch', category: 'Documents', quantity: '0', requiredQuantity: '1 set', completed: false },
    ],
    safetyInstructions: [
      { phase: 'before', action: 'Elevate all electrical items', details: 'Move appliances at least 3 feet off the ground to prevent waterlogging shorts.' },
      { phase: 'before', action: 'Seal door gaps', details: 'Use sandbags or waterproofing tape around exterior doors and low windows.' },
      { phase: 'during', action: 'Turn off the main power line', details: 'Shut down mains if water enters the house to avoid electrocution.' },
      { phase: 'during', action: 'Stay on upper floors', details: 'If ground floor floods, move to upper floors and signal rescuers from windows.' },
      { phase: 'after', action: 'Sanitize standing water spots', details: 'Clean up residues and use disinfectant to prevent dengue/malaria breeding.' },
      { phase: 'after', action: 'Do not drink tap water', details: 'After flooding, treat all tap water as contaminated. Use stored bottled water only.' },
    ]
  },
  moderate: {
    riskLevel: 'moderate',
    checklist: [
      { id: 'c1', item: 'Drinking Water bottles', category: 'Survival', quantity: '0', requiredQuantity: '10L', completed: false },
      { id: 'c2', item: 'Basic First-Aid kit', category: 'Medical', quantity: '0', requiredQuantity: '1 kit', completed: false },
      { id: 'c3', item: 'Power bank & dry food', category: 'Survival', quantity: '0', requiredQuantity: '1 pack', completed: false },
      { id: 'c4', item: 'Raincoat and rubber boots', category: 'Safety', quantity: '0', requiredQuantity: '1 set per person', completed: false },
    ],
    safetyInstructions: [
      { phase: 'before', action: 'Inspect roof and gutters', details: 'Clear dry leaves and seal visible cracks to prevent ceiling leaks.' },
      { phase: 'during', action: 'Stay indoors during heavy downpours', details: 'Avoid parking under weak structures or trees.' },
      { phase: 'after', action: 'Check vehicle tires and brakes', details: 'Ensure proper grip before driving on slick tarmac.' },
    ]
  },
  low: {
    riskLevel: 'low',
    checklist: [
      { id: 'c1', item: 'Umbrella and raincoat', category: 'Safety', quantity: '0', requiredQuantity: '1 per person', completed: false },
      { id: 'c2', item: 'Basic First-Aid kit', category: 'Medical', quantity: '0', requiredQuantity: '1 kit', completed: false },
    ],
    safetyInstructions: [
      { phase: 'before', action: 'Standard monsoon prep', details: 'Check drainage around your home and secure outdoor furniture.' },
      { phase: 'during', action: 'Drive carefully', details: 'Reduced visibility and wet roads require slower speeds.' },
      { phase: 'after', action: 'Check for dampness', details: 'Inspect walls and ceiling for seepage after heavy rains.' },
    ]
  }
};

// ─── Risk Heuristic ───────────────────────────────────────────────────────────
const HIGH_RISK_ZONES = ['mumbai', 'chennai', 'kolkata', 'patna', 'assam', 'kerala', 'bengaluru', 'bhubaneswar', 'hyderabad', 'guwahati'];

const getRiskLevel = (location: string, buildingType: string): 'high' | 'moderate' | 'low' => {
  const loc = location.toLowerCase();
  const isFloodZone = HIGH_RISK_ZONES.some(c => loc.includes(c));
  if (isFloodZone || buildingType === 'ground_floor') return 'high';
  if (buildingType === 'high_rise') return 'moderate';
  return 'moderate';
};

// ─── AI Service ───────────────────────────────────────────────────────────────
export class AIService {

  /**
   * Generates a fully personalized safety manual and checklist using Gemini.
   * Falls back to static template on API unavailability or malformed response.
   */
  static async generatePreparednessPlan(
    location: string,
    householdSize: number,
    buildingType: 'ground_floor' | 'high_rise' | 'independent',
    vulnerabilities: string[],
    members: any[],
    language: string = 'English'
  ) {
    const riskLevel = getRiskLevel(location, buildingType);

    if (!genAI) {
      return { ...FALLBACK_PLANS[riskLevel], location, householdSize, buildingType, vulnerabilities, members, language };
    }

    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `You are a senior crisis management and disaster safety expert specialized in Indian monsoon hazards.

Generate a highly personalized Monsoon Preparedness Plan for:
- Location: ${location}
- Building Type: ${buildingType}
- Household Members (${householdSize} people):
${JSON.stringify(members, null, 2)}
- Output Language: ${language}

Respond with ONLY a raw JSON object (no markdown, no code fences). Use this schema exactly:
{
  "riskLevel": "high" | "moderate" | "low",
  "checklist": [
    { "id": "c1", "item": "item name", "category": "Survival" | "Medical" | "Power" | "Safety" | "Documents", "quantity": "0", "requiredQuantity": "amount", "completed": false }
  ],
  "safetyInstructions": [
    { "phase": "before" | "during" | "after", "action": "short action title", "details": "detailed description" }
  ]
}

Scale checklist quantities based on household size. If any member has special vulnerabilities (elderly, infant, medical), add specific custom items and instructions for them. Translate everything into ${language} if not English.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = safeJsonParse<any>(text);

      if (!parsed || !parsed.riskLevel || !Array.isArray(parsed.checklist) || !Array.isArray(parsed.safetyInstructions)) {
        console.warn('[RainReady] Gemini returned malformed plan JSON. Using fallback.');
        return { ...FALLBACK_PLANS[riskLevel], location, householdSize, buildingType, vulnerabilities, members, language };
      }

      return parsed;
    } catch (error) {
      console.error('[RainReady] Gemini plan generation failed:', error);
      return { ...FALLBACK_PLANS[riskLevel], location, householdSize, buildingType, vulnerabilities, members, language };
    }
  }

  /**
   * Assesses road/route travel safety using Gemini.
   * Falls back to heuristic-based assessment if AI is unavailable.
   */
  static async assessTravelSafety(origin: string, destination: string, mode: string = 'driving') {
    const fallback = {
      hazardRating: 4,
      advisory: 'Monsoon driving requires caution due to hydroplaning risks and reduced visibility.',
      precautions: [
        'Check tire tread depth and pressure before departure.',
        'Keep headlamps on low beam in heavy rain.',
        'Avoid driving through standing water — even 15cm can stall an engine.',
      ]
    };

    if (!genAI) {
      const isGhatsRoute = [origin, destination].some(p =>
        ['pune', 'lonavala', 'mumbai', 'ghat', 'nashik', 'mahabaleshwar'].some(k => p.toLowerCase().includes(k))
      );
      return isGhatsRoute
        ? { hazardRating: 7, advisory: 'Western Ghats routes carry high landslide and fog risks during monsoon. Drive with extreme caution.', precautions: fallback.precautions }
        : fallback;
    }

    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `Analyze the safety of traveling from "${origin}" to "${destination}" via "${mode}" during heavy monsoon rains in India.

Consider: waterlogging, landslide hazards, visibility, road blockages, and mode-specific risks.

Respond with ONLY a raw JSON object (no markdown, no code fences):
{
  "hazardRating": <number 1-10>,
  "advisory": "<main safety summary>",
  "precautions": ["<precaution 1>", "<precaution 2>", "<precaution 3>"]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = safeJsonParse<any>(text);

      if (!parsed || typeof parsed.hazardRating !== 'number' || !parsed.advisory) {
        console.warn('[RainReady] Malformed travel assessment from Gemini. Using fallback.');
        return fallback;
      }

      return parsed;
    } catch (error) {
      console.error('[RainReady] Gemini travel assessment failed:', error);
      return fallback;
    }
  }

  /**
   * Multilingual emergency safety assistant chatbot.
   */
  static async chatAssistant(
    history: { role: 'user' | 'model'; parts: string }[],
    message: string,
    language: string = 'English'
  ) {
    if (!genAI) {
      return {
        reply: `[Offline Mode] Safety tip: If electrical mains are flooded, do not touch switches. Stay elevated and call emergency services. (Language preference: ${language})`
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const chatHistory = history.map(h => ({
        role: h.role,
        parts: [{ text: h.parts }]
      }));

      const systemInstruction = `You are RainReady, a calm, accurate, and compassionate multilingual safety assistant helping Indian citizens during monsoon emergencies. Always respond in ${language}. Be concise (under 120 words). Prioritize life safety. Do not speculate. If unsure, recommend calling emergency services (112 in India).`;

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 300 }
      });

      const result = await chat.sendMessage(`${systemInstruction}\n\nUser: ${message}`);
      return { reply: result.response.text().trim() };
    } catch (error) {
      console.error('[RainReady] Gemini chat error:', error);
      return {
        reply: 'Our safety assistant is temporarily unavailable. If you are in immediate danger, call 112 (India emergency). For flood rescue, contact NDRF at 011-24363260.'
      };
    }
  }
}
