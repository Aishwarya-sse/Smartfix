const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.log(
    "⚠️ [AI Agent] No GEMINI_API_KEY found in .env. Activating Intelligent Mock AI Engine.",
  );
}

const REPORTING_SYSTEM_PROMPT = `
You are "SmartFix AI - Civic Reporting Specialist", an agentic AI utility dispatcher.
Your goal is to help citizens diagnose, report and resolve municipal issues (Garbage, Water, Electricity, Roads).

CRITICAL SEVERITY & SERIOUSNESS RULES:
Evaluate strictly if the issue is a serious public municipal concern:
1. SERIOUS CONCERNS (Allow filing):
   - Overflowing public trash bins, dumpsters, roadside garbage causing odor/sanitation hazards.
   - Potholes, road collapses, or structural craters on public streets.
   - Public water pipe bursts, sewage leaks, or heavy street flooding.
   - Sparking electrical transformers, fallen overhead wires, exposed cables, or street blackouts.
2. MINOR, PRIVATE OR SELF-RESOLVABLE CONCERNS (Refuse filing and guide self-resolution):
   - A few dry autumn leaves, single wrappers, or small papers on sidewalks.
   - Minor leaks from private garden hoses or AC units.
   - Blown light bulbs in private rooms/apartments.
If minor, politely refuse to file a ticket and guide self-resolution. Set action to "NONE".

CRITICAL RULE: You MUST output YOUR ENTIRE RESPONSE as a single valid JSON object. Do not include any text outside the JSON block. Do not use markdown wrappers.
The JSON object MUST perfectly match this schema:
{
  "text": "The conversation reply to show to the user. Explain the severity assessment, ask clarifying questions, or give self-resolution guides.",
  "title_issue": "Generated descriptive title of the problem if serious (e.g., 'Municipal Garbage Overflow & Sanitation Hazard'). Leave blank or 'N/A' if minor.",
  "description": "Extremely detailed, professional, and structured summary of the problem if serious. If minor, write 'N/A'.",
  "action": "NONE | MAP_PINNER | SELECT_REQUEST | ESCALATE_TO_HUMAN",
  "actiondesc": "Description of what action is taken",
  "category": "garbage | water | electricity | roads | other"
}
`;

const ANALYST_SYSTEM_PROMPT = `
You are "Urban Analyst AI", a state-of-the-art municipal data analyst.
Your job is to assist citizens with statistical analysis, civic points scorecards, and local municipal health performance metrics.

INSTRUCTIONS:
1. When asked about past requests, statistics, points, or city performance, analyze the provided JSON data and summarize it in a highly professional, graphical, and conversational tone.
2. You can calculate resolution ratios, highlight categories with the most reports, praise their badge tier, and give insights into municipal response times.
3. Keep action as "NONE" and focus on data analysis.

You MUST output YOUR ENTIRE RESPONSE as a single valid JSON object matching this schema:
{
  "text": "Your conversational analysis reply with formatted markdown statistics, bulleted lists, and encouraging insights...",
  "title_issue": "",
  "description": "",
  "action": "NONE",
  "actiondesc": "",
  "category": "other"
}
`;

const ESCALATION_SYSTEM_PROMPT = `
You are "SmartFix Support Executive Agent", a customer care specialist.
Your goal is to handle grievances, complaints, and ticket escalations for frustrated citizens.

INSTRUCTIONS:
1. If the user complains about delays, technician absence, is angry, or specifically requests escalation/human support, IMMEDIATELY set the action to "ESCALATE_TO_HUMAN".
2. Set "title_issue" to the complaint title they are referring to.
3. Draft a formal support escalation email to support@smartfix.com inside the "description" or "actiondesc" (including a subject, explanation of the delay, and urgent call to action).
4. Comfort the user, apologize sincerely, and explain that a human executive (John Doe, Lead Municipal Dispatcher) has been assigned to contact them within 2 hours.

You MUST output YOUR ENTIRE RESPONSE as a single valid JSON object matching this schema:
{
  "text": "Your comforting, professional response confirming immediate escalation...",
  "title_issue": "Title of the ticket being escalated",
  "description": "Grievance details...",
  "action": "ESCALATE_TO_HUMAN | NONE",
  "actiondesc": "Draft email body...",
  "category": "other"
}
`;

/**
 * Intelligent Mock AI Engine that simulates Gemini agentic flow perfectly
 */
const runMockAgent = (messages, contextData, botType = 'smartfix') => {
  const history = messages || [];
  const lastUserMessage =
    [...history]
      .reverse()
      .find((m) => m.sender === "user")
      ?.text?.toLowerCase() || "";

  // 1. Analyst Agent Mock
  if (botType === 'analyst') {
    const totalRequests = contextData?.myRequests?.length || 0;
    const points = contextData?.myCivicPoints || 150;
    const badge = contextData?.myBadge || 'Silver';
    const zone = contextData?.userZone || 'Chennai Local';
    
    let text = `📊 **Urban Analyst AI - Scorecard & Performance Report**\n\n`;
    text += `👤 **User Profile:** Citizen Partner in **${zone}**\n`;
    text += `⭐ **Civic Standing:** **${points} PTS** (Tier: **${badge}**)\n`;
    text += `📝 **Total Requests Logged:** **${totalRequests}**\n\n`;
    
    if (totalRequests > 0) {
      const resolved = contextData.myRequests.filter(r => ['resolved', 'done'].includes((r.status || '').toLowerCase())).length;
      const pending = totalRequests - resolved;
      const rate = Math.round((resolved / totalRequests) * 100);
      
      text += `📈 **Performance Metrics:**\n`;
      text += `* **SLA Resolution Rate:** **${rate}%** of your reports have been fully closed.\n`;
      text += `* **Active Issues:** **${pending}** pending/in-progress municipal repairs.\n`;
      text += `* **Completed Fixes:** **${resolved}** verifications successfully closed.\n\n`;
      text += `💡 **Analytical Insight:** Your active reporting has significantly boosted your district's standing. Keep sharing civic feed updates to maintain your **${badge}** badge!`;
    } else {
      text += `No recent municipal reports found under your credentials. Keep an eye out for potholes, garbage heaps, or street blackouts to start earning Civic Points!`;
    }
    
    return {
      text,
      action: null
    };
  }

  // 2. Escalation Agent Mock
  if (botType === 'human' || lastUserMessage.includes("human") || lastUserMessage.includes("escalate") || lastUserMessage.includes("support")) {
    const draftEmail = `Subject: Escalation Request [CRITICAL] - SmartFix\n\nDear Executive Support Team,\n\nThe user is reporting a critical issue and has requested human intervention. \nUser Message: '${lastUserMessage}'\n\nPlease review and contact them immediately.\n\nSincerely,\nSmartFix Support Executive Agent`;
    
    return {
      text: `I completely understand your frustration and apologize for the inconvenience. I am immediately escalating your grievance to our Human Executive Team. Lead Dispatcher John Doe will review your case and contact you via email within 2 hours.\n\nA ticket escalation request has been logged in our command center.`,
      action: {
        action: "ESCALATE_TO_HUMAN",
        summary: "User requested human escalation due to urgent unresolved issue.",
        emailDraft: draftEmail
      }
    };
  }

  // 1.5 Minor/Small Issue Check (Reporting Agent)
  const isMinorIssue = 
    lastUserMessage.includes("wrapper") ||
    lastUserMessage.includes("candy") ||
    lastUserMessage.includes("leaf") ||
    lastUserMessage.includes("leaves") ||
    lastUserMessage.includes("single bulb") ||
    lastUserMessage.includes("room bulb") ||
    lastUserMessage.includes("garden tap") ||
    lastUserMessage.includes("garden hose") ||
    lastUserMessage.includes("private bulb") ||
    lastUserMessage.includes("dim bulb") ||
    lastUserMessage.includes("small paper") ||
    lastUserMessage.includes("droplet") ||
    lastUserMessage.includes("drops") ||
    lastUserMessage.includes("single piece") ||
    lastUserMessage.includes("dry leaf");

  if (isMinorIssue) {
    return {
      text: "⚠️ **MINOR / PRIVATE CONCERN RESOLVED BY CITIZEN**\n\nThis seems to be a minor or private concern (e.g., a candy wrapper, garden hose, dry leaf, or a private room bulb) that can be easily and safely resolved on your own.\n\nTo ensure our service partners can prioritize critical and hazardous public utility repairs for the city, **we do not register official complaints for small or personal issues.**\n\n💡 **Self-Resolution Guide:**\n* **Debris/Paper:** Kindly pick it up and dispose of it in the nearest trash bin.\n* **Hose/Tap:** Ensure your private garden nozzle is fully tightened.\n* **Indoor Bulb:** Switch off the socket and replace the bulb with a new one.\n\nThank you for doing your part to keep our neighborhood clean and safe!",
      action: null
    };
  }

  // 1.75 Past Requests Check
  if (
    lastUserMessage.includes("last request") ||
    lastUserMessage.includes("my issues") ||
    lastUserMessage.includes("past request") ||
    lastUserMessage.includes("my ticket")
  ) {
    if (contextData && contextData.myRequests && contextData.myRequests.length > 0) {
      const lastReq = contextData.myRequests[0];
      return {
        text: `Certainly! Your last request was a **${lastReq.title || lastReq.category}** issue reported recently. Its current status is **${(lastReq.status || 'Pending').toUpperCase()}**.\n\nYou have raised ${contextData.myRequests.length} issues in total. Is there anything specific you would like me to do with them?`,
        action: null
      };
    } else {
      return {
        text: "I checked your records, and it seems you haven't raised any issues yet. How can I help you today?",
        action: null
      };
    }
  }

  // 2. Initial state
  if (history.length <= 1) {
    return {
      text: "Hello! I am SmartFix AI, your intelligent public utility assistant. 🛠️\n\nI can help you report and resolve public issues like garbage overflow, water leakage, broken streetlights, or road potholes in your neighborhood.\n\nCould you please tell me what issue you are facing today?",
    };
  }

  // 3. User mentions category
  const hasGarbage = history.some(
    (m) =>
      m.text?.toLowerCase()?.includes("garbage") ||
      m.text?.toLowerCase()?.includes("trash") ||
      m.text?.toLowerCase()?.includes("waste"),
  );
  const hasWater = history.some(
    (m) =>
      m.text?.toLowerCase()?.includes("water") ||
      m.text?.toLowerCase()?.includes("leak") ||
      m.text?.toLowerCase()?.includes("pipe"),
  );
  const hasElectricity = history.some(
    (m) =>
      m.text?.toLowerCase()?.includes("electricity") ||
      m.text?.toLowerCase()?.includes("power") ||
      m.text?.toLowerCase()?.includes("light"),
  );
  const hasRoads = history.some(
    (m) =>
      m.text?.toLowerCase()?.includes("road") ||
      m.text?.toLowerCase()?.includes("pothole") ||
      m.text?.toLowerCase()?.includes("street"),
  );

  // Count user responses
  const userMessages = history.filter((m) => m.sender === "user");

  if (hasGarbage) {
    if (userMessages.length === 1) {
      return {
        text: "I'd be glad to help resolve your garbage collection issue. 🗑️\n\nTo raise a formal complaint, could you tell me a bit more:\n1. Is it a household trash pile, commercial waste, or a public dumpster overflowing?\n2. How many days has it been neglected?\n3. Is it blocking the street or sidewalk?",
      };
    } else if (userMessages.length >= 2) {
      const userDetails = userMessages[1]?.text || "neglected waste";
      const title = "Municipal Garbage Overflow & Sanitation Hazard";
      const summary = `SmartFix AI Agent Report:
- **Incident Class:** Garbage & Sanitation Neglect
- **Severity Level:** Moderate-High
- **Citizen Report Details:** The citizen reports that garbage is overflowing: "${userDetails}".
- **Impact Assessment:** Emitting public odor, causing active sanitation hazards, and blocking pedestrian movement.
- **Recommended Action Plan:** Deploy nearest municipal sanitation partner for complete waste clearing and disinfection.`;

      return {
        text: `Got it. Thank you for these details. I have summarized the issue.\n\nTo assign a garbage collection partner, I need your exact location. **Please use the interactive map below to pin the exact coordinate of the garbage.** Once you confirm the location, I will match you with a local service partner.

\`\`\`json
{
  "action": "REQUEST_LOCATION",
  "category": "garbage",
  "title": "${title}",
  "summary": "${summary.replace(/\n/g, '\\n')}"
}
\`\`\`
`,
        action: {
          action: "REQUEST_LOCATION",
          category: "garbage",
          title,
          summary,
        },
      };
    }
  }

  if (hasWater) {
    if (userMessages.length === 1) {
      return {
        text: "I'd be glad to help with the water leakage issue. 🚰\n\nCould you please let me know:\n1. Is it a main pipe burst, municipal tap leak, or sewer blockage?\n2. Is the leaking water flooding the street or entering private property?\n3. How severe is the leakage (dripping vs. heavy flow)?",
      };
    } else if (userMessages.length >= 2) {
      const userDetails = userMessages[1]?.text || "pipe leakage";
      const title = "Urgent Public Water Main Leakage & Flooding";
      const summary = `SmartFix AI Agent Report:
- **Incident Class:** Water & Sewage Main Leakage
- **Severity Level:** Critical (flooding risks)
- **Citizen Report Details:** The citizen reports water leakage: "${userDetails}".
- **Impact Assessment:** Continuous potable water wastage, localized flooding risk, and structural dampness.
- **Recommended Action Plan:** Dispatch plumbing partner to isolate main valve and execute a sleeve repair on breached piping.`;

      return {
        text: `Understood. I have recorded the details. This water leakage requires immediate attention.\n\n**Please pin the exact location of the leak on the interactive map below** so we can send an emergency plumbing partner.

\`\`\`json
{
  "action": "REQUEST_LOCATION",
  "category": "water",
  "title": "${title}",
  "summary": "${summary.replace(/\n/g, '\\n')}"
}
\`\`\`
`,
        action: {
          action: "REQUEST_LOCATION",
          category: "water",
          title,
          summary,
        },
      };
    }
  }

  if (hasRoads) {
    if (userMessages.length === 1) {
      return {
        text: "I can help report road potholes or cracks. 🛣️\n\nCould you please tell me:\n1. How large is the pothole (e.g., small, large, crater)?\n2. Is it on a main highway or a narrow residential street?\n3. Has it caused any accidents or damage so far?",
      };
    } else if (userMessages.length >= 2) {
      const userDetails = userMessages[1]?.text || "road cracks";
      const title = "Hazardous Road Pothole Crater Alert";
      const summary = `SmartFix AI Agent Report:
- **Incident Class:** Road Infrastructure Damage
- **Severity Level:** High Risk (vehicle hazard)
- **Citizen Report Details:** The citizen reports road damage: "${userDetails}".
- **Impact Assessment:** Serious suspension damage risks, active traffic disruption, and slide hazards.
- **Recommended Action Plan:** Alert road maintenance team to execute instant asphalt filling, cold-mix compaction, and place safety barricades.`;

      return {
        text: `Got it. Potholes are very hazardous. I will register this immediately.\n\n**Please pin the location of the pothole on the map below** so we can alert our road maintenance partners.

\`\`\`json
{
  "action": "REQUEST_LOCATION",
  "category": "roads",
  "title": "${title}",
  "summary": "${summary.replace(/\n/g, '\\n')}"
}
\`\`\`
`,
        action: {
          action: "REQUEST_LOCATION",
          category: "roads",
          title,
          summary,
        },
      };
    }
  }

  if (hasElectricity) {
    if (userMessages.length === 1) {
      return {
        text: "I can help with electrical power issues. 💡\n\nCould you please provide:\n1. Is it a complete power blackout, single phase failure, or sparking wires?\n2. Are the streetlights out as well?\n3. Is there a transformer spark nearby?",
      };
    } else if (userMessages.length >= 2) {
      const userDetails = userMessages[1]?.text || "electrical fault";
      const title = "Dangerous Street Sparking & Power Fault";
      const summary = `SmartFix AI Agent Report:
- **Incident Class:** Electrical Infrastructure & Fire Hazard
- **Severity Level:** Life-Threatening (high voltage risk)
- **Citizen Report Details:** The citizen reports power issue: "${userDetails}".
- **Impact Assessment:** Local zone blackout, high potential electrical shock hazard, and nearby fire hazard.
- **Recommended Action Plan:** Dispatch emergency electrical partner to repair loose junctions and replace insulation.`;

      return {
        text: `Thank you for the details. Sparking or power failures are dangerous.\n\n**Please pin your exact building or pole location on the map below** so we can alert the electric board partners.

\`\`\`json
{
  "action": "REQUEST_LOCATION",
  "category": "electricity",
  "title": "${title}",
  "summary": "${summary.replace(/\n/g, '\\n')}"
}
\`\`\`
`,
        action: {
          action: "REQUEST_LOCATION",
          category: "electricity",
          title,
          summary,
        },
      };
    }
  }

  // Fallback default chat response
  return {
    text: "I've recorded that information. Could you please specify which category this falls into (Garbage, Water Leakage, Pothole, Electricity) so I can ask the right questions and raise a repair request?",
  };
};

/**
 * Calls Gemini or Mock AI to get the next message in the conversation
 * @param {Array} history - Array of previous messages in format { sender: 'user'|'ai'|'system', text: '...' }
 * @param {Object} contextData - Context variables (points, past requests)
 * @param {String} botType - Specific active AI agent type
 */
const generateResponse = async (history, contextData, botType = 'smartfix') => {
  // Select system prompt based on active botType
  let dynamicPrompt = REPORTING_SYSTEM_PROMPT;
  if (botType === 'analyst') {
    dynamicPrompt = ANALYST_SYSTEM_PROMPT;
  } else if (botType === 'human') {
    dynamicPrompt = ESCALATION_SYSTEM_PROMPT;
  }

  if (contextData) {
    dynamicPrompt += `\n\nLIVE USER CONTEXT (USE THIS TO ANSWER QUESTIONS):
- Civic Points: ${contextData.myCivicPoints} (${contextData.myBadge} Tier)
- Jurisdiction: ${contextData.userZone}
- Past Requests (JSON): ${JSON.stringify(contextData.myRequests)}

CRITICAL AMBIGUITY RULE:
If the user asks about the status of "my previous request" or "my ticket", AND they have more than 1 past request, AND they didn't specify which one, you MUST output this exact JSON block to trigger a UI selection popup:
\`\`\`json
{
  "action": "SELECT_REQUEST",
  "summary": "Please select the request you are asking about."
}
\`\`\`
If they only have 1 request, or if they clearly specify the request category/ID, answer normally using the JSON data provided above.`;
  }

  if (!genAI) {
    console.log(
      "⚠️ [AI Agent] No GEMINI_API_KEY found in .env. Returning local fallback simulation.",
    );
    // Mock Agent logic for SELECT_REQUEST
    if (
      contextData &&
      contextData.myRequests?.length > 1 &&
      history.length > 0
    ) {
      const lastMsg = history[history.length - 1].text.toLowerCase();
      if (
        (lastMsg.includes("status") ||
          lastMsg.includes("previous") ||
          lastMsg.includes("ticket")) &&
        !lastMsg.includes("id")
      ) {
        return {
          text: "You have multiple active requests. Please select the specific ticket you want to check the status of:",
          action: {
            action: "SELECT_REQUEST",
            summary: "Please select the request.",
          },
        };
      }
    }
    return runMockAgent(history, contextData, botType);
  }

  // Define 3 API models for sequential fallbacks (Primary, Secondary, Tertiary API links/models)
  const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      console.log(`🤖 [AI Agent] Routing to model: ${modelName} for agent: ${botType}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: dynamicPrompt,
      });

      // Format chat history for Gemini API
      const contents = history.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text || "" }],
      }));

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          responseMimeType: "application/json"
        },
      });

      let parsedObj = { text: "I have recorded your issue." };
      try {
        let cleanText = result.response.text().trim();
        // Aggressively strip any markdown wrappers the AI might hallucinate
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);

        parsedObj = JSON.parse(cleanText.trim());
      } catch (e) {
        console.error("Failed to parse pure JSON response:", e);
        parsedObj.text = result.response.text();
      }

      let action = null;
      if (parsedObj.action && parsedObj.action !== "NONE") {
        action = {
          action: parsedObj.action === "MAP_PINNER" ? "REQUEST_LOCATION" : parsedObj.action,
          category: parsedObj.category || "other",
          title: parsedObj.title_issue || "Civic Issue Report",
          summary: parsedObj.description || "Issue reported via AI",
          actiondesc: parsedObj.actiondesc || ""
        };
      }

      return {
        text: parsedObj.text || "...",
        action,
      };

    } catch (error) {
      console.warn(`⚠️ [AI Agent Fallback Warning] Model ${modelName} failed: ${error.message}. Trying next fallback model...`);
      lastError = error;
    }
  }

  // If all three models fail, fall back to the Intelligent Mock Agent (3rd tier final fallback)
  console.error("❌ [Gemini API Multi-Model failure] All 3 models failed. Dropping to intelligent local rule engine:", lastError?.message);
  return runMockAgent(history, contextData, botType);
};

/**
 * Transcribes Base64 audio using the Google Gemini Multimodal API (gemini-2.5-flash)
 */
const transcribeAudio = async (base64Data, mimeType) => {
  if (!genAI) {
    console.log(
      "⚠️ [AI Agent Transcribe] No GEMINI_API_KEY found in .env. Returning local fallback simulation.",
    );
    return "This is a simulated speech transcription. Please configure your GEMINI_API_KEY in the backend .env to enable actual voice recognition!";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Normalize audio/m4a to audio/mp4 for robust Gemini API decoding
    let normalizedMimeType = mimeType || "audio/mp4";
    if (
      normalizedMimeType === "audio/m4a" ||
      normalizedMimeType.includes("m4a")
    ) {
      normalizedMimeType = "audio/mp4";
    }

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: normalizedMimeType,
        },
      },
      "Transcribe this audio exactly. Return only the transcription text, nothing else. If there is no speech, return an empty string.",
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error("❌ [Gemini Audio Transcription Error]:", error);
    throw error;
  }
};

/**
 * Generates details for a new public utility service request based on conversation history and GPS coordinates.
 */
const generateRequestDetails = async (messages, latitude, longitude) => {
  const conversationText = (messages || []).map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');
  const lastUserMsgText = [...(messages || [])].reverse().find(m => m.sender === 'user')?.text || '';
  
  if (!genAI) {
    console.log("⚠️ [AI Agent] No GEMINI_API_KEY found in .env. Returning local fallback simulation for request generation.");
    
    let category = "other";
    let title = "Civic Issue Report";
    let description = lastUserMsgText || "Civic issue reported via SmartFix Map Pin.";

    const textLower = conversationText.toLowerCase();
    if (textLower.includes("garbage") || textLower.includes("trash") || textLower.includes("waste")) {
      category = "garbage";
      title = "Municipal Garbage Overflow & Sanitation Hazard";
      description = `SmartFix AI Agent Report:
- **Incident Class:** Garbage & Sanitation Neglect
- **Severity Level:** Moderate-High
- **Citizen Report Details:** "${lastUserMsgText || 'Garbage overflow reported'}"
- **Impact Assessment:** Emitting public odor, causing active sanitation hazards, and blocking pedestrian movement.
- **Recommended Action Plan:** Deploy nearest municipal sanitation partner for complete waste clearing and disinfection.`;
    } else if (textLower.includes("water") || textLower.includes("leak") || textLower.includes("pipe")) {
      category = "water";
      title = "Urgent Public Water Main Leakage & Flooding";
      description = `SmartFix AI Agent Report:
- **Incident Class:** Water & Sewage Main Leakage
- **Severity Level:** Critical (flooding risks)
- **Citizen Report Details:** "${lastUserMsgText || 'Water leakage reported'}"
- **Impact Assessment:** Continuous potable water wastage, localized flooding risk, and structural dampness.
- **Recommended Action Plan:** Dispatch plumbing partner to isolate main valve and execute a sleeve repair on breached piping.`;
    } else if (textLower.includes("road") || textLower.includes("pothole") || textLower.includes("street")) {
      category = "roads";
      title = "Hazardous Road Pothole Crater Alert";
      description = `SmartFix AI Agent Report:
- **Incident Class:** Road Infrastructure Damage
- **Severity Level:** High Risk (vehicle hazard)
- **Citizen Report Details:** "${lastUserMsgText || 'Road pothole reported'}"
- **Impact Assessment:** Serious suspension damage risks, active traffic disruption, and slide hazards.
- **Recommended Action Plan:** Alert road maintenance team to execute instant asphalt filling, cold-mix compaction, and place safety barricades.`;
    } else if (textLower.includes("electricity") || textLower.includes("power") || textLower.includes("light") || textLower.includes("spark")) {
      category = "electricity";
      title = "Dangerous Street Sparking & Power Fault";
      description = `SmartFix AI Agent Report:
- **Incident Class:** Electrical Infrastructure & Fire Hazard
- **Severity Level:** Life-Threatening (high voltage risk)
- **Citizen Report Details:** "${lastUserMsgText || 'Electrical fault reported'}"
- **Impact Assessment:** Local zone blackout, high potential electrical shock hazard, and nearby fire hazard.
- **Recommended Action Plan:** Dispatch emergency electrical partner to repair loose junctions and replace insulation.`;
    }

    return { title, description, category };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a SmartFix AI Backend Dispatcher.
Your task is to analyze the conversation history and the reported GPS coordinates, and generate structured details for a new public utility service request.

Conversation History:
${conversationText}

Reported Coordinates: Latitude ${latitude}, Longitude ${longitude}

You MUST output your entire response as a format text: {}
{
  "title_issue": "title of the problem",
  "description": "detailed of the problem",
  "action": "Map pinner | Popup | Selector",
  "actiondesc": "",
  "category": "garbage | water | electricity | roads | other"
}

Ensure the category is exactly one of: "garbage", "water", "electricity", "roads", or "other". Do not include markdown code block syntax. Only return the JSON.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    let cleanText = result.response.text().trim();
    if(cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
    if(cleanText.startsWith('```')) cleanText = cleanText.substring(3);
    if(cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);

    const parsed = JSON.parse(cleanText.trim());
    return {
      title: parsed.title_issue || "Civic Issue Report",
      description: parsed.description || parsed.detailed_of_the_problem || "Issue reported via AI",
      category: parsed.category || "other"
    };
  } catch (error) {
    console.error("Error generating request details via Gemini:", error);
    return {
      title: "Civic Issue Report",
      description: lastUserMsgText || "Issue reported via AI",
      category: "other"
    };
  }
};

module.exports = { generateResponse, transcribeAudio, generateRequestDetails };
