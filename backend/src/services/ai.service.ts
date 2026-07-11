import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Minimalist fallback databases to keep code production-safe and functional offline
const FALLBACK_PLANS: Record<string, any> = {
  high: {
    riskLevel: 'high',
    checklist: [
      { id: 'c1', item: 'Packaged Drinking Water (20 Litres)', category: 'Survival', quantity: '0', requiredQuantity: '20L', completed: false },
      { id: 'c2', item: 'Waterproof First-Aid & Emergency Meds', category: 'Medical', quantity: '0', requiredQuantity: '1 kit', completed: false },
      { id: 'c3', item: 'Fully charged 20000mAh Power Banks', category: 'Power', quantity: '0', requiredQuantity: '2 units', completed: false },
      { id: 'c4', item: 'Dry food (biscuits, dry fruits, roasted chana)', category: 'Survival', quantity: '0', requiredQuantity: '3 days', completed: false },
      { id: 'c5', item: 'Heavy-duty flashlight and spare cells', category: 'Safety', quantity: '0', requiredQuantity: '2 units', completed: false }
    ],
    safetyInstructions: [
      { phase: 'before', action: 'Elevate all electrical items', details: 'Move appliances at least 3 feet off the ground to prevent waterlogging shorts.' },
      { phase: 'during', action: 'Turn off the main power line', details: 'Shut down mains if water enters the house to avoid electrocution.' },
      { phase: 'after', action: 'Sanitize standing water spots', details: 'Clean up residues and use disinfectant to prevent dengue/malaria breeding.' }
    ]
  },
  moderate: {
    riskLevel: 'moderate',
    checklist: [
      { id: 'c1', item: 'Drinking Water bottles', category: 'Survival', quantity: '0', requiredQuantity: '10L', completed: false },
      { id: 'c2', item: 'Basic First-Aid kit', category: 'Medical', quantity: '0', requiredQuantity: '1 kit', completed: false },
      { id: 'c3', item: 'Power bank & dry food', category: 'Survival', quantity: '0', requiredQuantity: '1 pack', completed: false }
    ],
    safetyInstructions: [
      { phase: 'before', action: 'Inspect roof and gutters', details: 'Clear dry leaves and seal visible cracks to prevent ceiling leaks.' },
      { phase: 'during', action: 'Stay indoors during heavy downpours', details: 'Avoid parking under weak structures or trees.' },
      { phase: 'after', action: 'Check vehicle tires and brakes', details: 'Ensure proper grip before driving on slick tarmac.' }
    ]
  }
};

export class AIService {
  /**
   * Generates a fully personalized safety manual and checklist
   */
  static async generatePreparednessPlan(
    location: string,
    householdSize: number,
    buildingType: 'ground_floor' | 'high_rise' | 'independent',
    vulnerabilities: string[],
    members: any[],
    language: string = 'English'
  ) {
    // Determine risk heuristically first for fallbacks
    const isFloodZone = ['mumbai', 'chennai', 'kolkata', 'patna', 'assam', 'kerala', 'bengaluru'].some(c => 
      location.toLowerCase().includes(c)
    );
    const riskLevel = (isFloodZone || buildingType === 'ground_floor') ? 'high' : 'moderate';

    if (!genAI) {
      console.warn('GEMINI_API_KEY is not defined. Falling back to local preparedness planner.');
      const fallback = FALLBACK_PLANS[riskLevel];
      return {
        location,
        householdSize,
        buildingType,
        vulnerabilities,
        members,
        riskLevel,
        checklist: fallback.checklist,
        safetyInstructions: fallback.safetyInstructions,
        language
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const prompt = `
You are a senior crisis management and disaster safety expert specialized in Indian monsoon hazards (floods, waterlogging, high winds, landslides, structural failures, and vector-borne diseases).

Generate a highly personalized Monsoon Preparedness Plan for:
- Location: ${location}
- Building Type: ${buildingType}
- Family Directory Details:
${JSON.stringify(members, null, 2)}
- Preferred Output Language: ${language}

Your response must be a single, valid JSON object (no markdown backticks, no code blocks, just raw JSON). Use this exact schema structure:
{
  "riskLevel": "high" | "moderate" | "low",
  "checklist": [
    { "id": "string", "item": "item name", "category": "Survival" | "Medical" | "Power" | "Safety" | "Documents", "quantity": "0", "requiredQuantity": "string", "completed": false }
  ],
  "safetyInstructions": [
    { "phase": "before" | "during" | "after", "action": "short action title", "details": "detailed description of what to do" }
  ]
}

Adjust quantities dynamically: base checklist quantities on the household members listed. Provide custom safety guidelines in safetyInstructions matching specific member profiles (e.g. if there is a senior citizen or infant, specify custom medical or evacuation tasks). Ensure the instructions and checklist are fully translated into ${language} if requested.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Gemini plan generation failed, falling back:', error);
      const fallback = FALLBACK_PLANS[riskLevel];
      return {
        location,
        householdSize,
        buildingType,
        vulnerabilities,
        members,
        riskLevel,
        checklist: fallback.checklist,
        safetyInstructions: fallback.safetyInstructions,
        language
      };
    }
  }

  /**
   * Assesses road/route travel safety parameters
   */
  static async assessTravelSafety(
    origin: string,
    destination: string,
    mode: string = 'driving'
  ) {
    if (!genAI) {
      console.warn('GEMINI_API_KEY missing. Falling back to local travel risk analyzer.');
      const isLonavalaOrWesternGhats = [origin, destination].some(p => 
        p.toLowerCase().includes('pune') || p.toLowerCase().includes('lonavala') || p.toLowerCase().includes('mumbai') || p.toLowerCase().includes('ghat')
      );
      return {
        hazardRating: isLonavalaOrWesternGhats ? 7 : 3,
        advisory: isLonavalaOrWesternGhats 
          ? 'Western Ghats routes carry high landslide and heavy fog risks during monsoon storms. Drive with extreme caution.'
          : 'Normal monsoon slick roads. Check wiper blades and reduce speeds.',
        precautions: [
          'Maintain double the normal stopping distance.',
          'Avoid routes with low-lying subways or waterlogged underpasses.',
          'Carry an emergency glass breaker and emergency contact card.'
        ]
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      const prompt = `
Analyze the safety of traveling from "${origin}" to "${destination}" via "${mode}" during a heavy rain/monsoon season.
Assess potential waterlogging, landslide hazards, visibility, and road blockages typical for this route.

Provide a single, valid JSON object (no code blocks, no markdown backticks):
{
  "hazardRating": number, // scale 1 (safe) to 10 (extremely dangerous)
  "advisory": "string (main safety warning summary)",
  "precautions": [
    "precaution 1",
    "precaution 2",
    "precaution 3"
  ]
}
`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Gemini travel assessment failed, falling back:', error);
      return {
        hazardRating: 4,
        advisory: 'Monsoon driving requires caution due to hydroplaning risks.',
        precautions: ['Check tire tread depth', 'Keep headlamps on low beam', 'Avoid driving through standing water']
      };
    }
  }

  /**
   * Interactive emergency safety advisor chatbot
   */
  static async chatAssistant(
    history: { role: 'user' | 'model'; parts: string }[],
    message: string,
    language: string = 'English'
  ) {
    if (!genAI) {
      console.warn('GEMINI_API_KEY missing. Falling back to local QA helper.');
      return {
        reply: `[Offline Mode] Safety tip: If electrical mains are flooded, do not touch switches. Ensure you stay elevated. (Language: ${language})`
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      
      const chatHistory = history.map(h => ({
        role: h.role,
        parts: [{ text: h.parts }]
      }));

      const systemPrompt = `You are a helpful, multilingual safety bot assisting citizens during monsoon emergencies. Respond accurately, briefly, and compassionately in the requested language: ${language}. Current query: ${message}`;
      
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 250 }
      });

      const result = await chat.sendMessage(systemPrompt);
      return { reply: result.response.text().trim() };
    } catch (error) {
      console.error('Gemini chat failed:', error);
      return {
        reply: 'Emergency safety channels are currently congested. Please seek immediate rescue support if in danger, or head to higher grounds.'
      };
    }
  }
}
