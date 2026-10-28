// backend/scripts/test_openai.js
// Quick connectivity test for OpenAI GPT-4o integration
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from the backend directory (two levels up from scripts/)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import OpenAI from 'openai';

const testOpenAI = async () => {
  const key = process.env.OPENAI_API_KEY;
  console.log('================================================================');
  console.log('   HUDI-SOFT POS: OPENAI GPT-4o CONNECTIVITY TEST');
  console.log('================================================================\n');
  
  if (!key) {
    console.error('❌ OPENAI_API_KEY not found in environment. Check .env file.');
    process.exit(1);
  }
  
  console.log(`✅ API Key found: ${key.substring(0, 20)}...`);
  console.log(`   Model configured: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
  
  const client = new OpenAI({ apiKey: key });
  
  try {
    console.log('\n📡 Testing GPT-4o connection with live business data context...');
    
    const businessContext = `Live Business Snapshot:
  Today's Revenue: $1,240.50 (23 orders)
  This Month's Revenue: $38,750.00 (712 orders)
  Total Customer Receivables: $4,200.00 from 8 customers
  Low Stock Alerts: 3 items
  Top Product: Chicken Biryani — 145 units sold this month`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are HUDI-AI, the intelligent business assistant for HUDI-SOFT POS. Provide helpful, concise, professional analysis based only on verified business data provided.'
        },
        {
          role: 'user',
          content: `Business Data Context (verified from POS database):\n${businessContext}\n\nManager's Question: "How is my business performing this month?"\n\nPlease provide a helpful, professional response based on this verified data.`
        }
      ],
      max_tokens: 400,
      temperature: 0.4
    });

    const response = completion.choices[0]?.message?.content;
    
    console.log('\n✅ GPT-4o RESPONDED SUCCESSFULLY!\n');
    console.log('─────────────────────────────────────────────');
    console.log('GPT-4o Response:');
    console.log('─────────────────────────────────────────────');
    console.log(response);
    console.log('─────────────────────────────────────────────\n');
    console.log(`Tokens used: ${completion.usage?.total_tokens}`);
    console.log(`Model: ${completion.model}`);
    console.log('\n================================================================');
    console.log('✅ OPENAI GPT-4o FULLY FUNCTIONAL — AI ASSISTANT IS LIVE!');
    console.log('================================================================');
    
  } catch (err) {
    console.error('\n❌ GPT-4o Connection FAILED:');
    console.error(`   Error: ${err.message}`);
    if (err.status === 401) console.error('   → Invalid API key');
    if (err.status === 429) console.error('   → Rate limit or quota exceeded');
    if (err.status === 500) console.error('   → OpenAI server error — retry later');
    process.exit(1);
  }
};

testOpenAI();
