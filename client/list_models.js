import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Simple .env parser since we can't assume dotenv is installed
function getEnvValue(key) {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(new RegExp(`${key}=(.+)`));
            if (match) return match[1].trim();
        }
    } catch (e) {
        console.error("Error reading .env:", e);
    }
    return null;
}

async function listModels() {
    const apiKey = getEnvValue("VITE_GEMINI_API_KEY");
    if (!apiKey) {
        console.error("Could not find VITE_GEMINI_API_KEY in .env file");
        return;
    }

    console.log("Using API Key: " + apiKey.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // We need to access the model list correctly. 
        // The SDK might not expose listModels directly on the main class easily in all versions,
        // but let's try to query a known model or just use the API endpoint if SDK fails.
        // Actually SDK doesn't always have listModels helper. 
        // Let's try getting a model and printing info, or fallback to fetch.

        console.log("Attempting to list models...");
        // Since the SDK wrapper focuses on inference, we might not have a clean listModels method exposed publicly 
        // in the simpler imports. Let's try to make a raw REST call using the key to fail-safe.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                    console.log(`  Description: ${m.description}`);
                    console.log(`  Methods: ${m.supportedGenerationMethods.join(', ')}`);
                    console.log("---");
                }
            });
        } else {
            console.log("No models returned or error:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
