require('dotenv').config();
console.log("ENV CHECK:", process.env.DATABASE_URL);

const fetch = require('node-fetch');
const express = require('express');
const pool = require('./db/db');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // for result.html
app.use(cors());

// ✅ Home
app.get('/', (req, res) => {
  res.send('Server running 🚀');
});


// ✅ ANALYZE API
app.post('/analyze', async (req, res) => {
  const { softwareName } = req.body;

  if (!softwareName) {
    return res.status(400).json({ error: 'softwareName is required' });
  }

  try {
    // ✅ 1. CHECK DATABASE
    const dbResult = await pool.query(
      'SELECT * FROM software_genome WHERE LOWER(software_name) = LOWER($1)',
      [softwareName]
    );

    if (dbResult.rows.length > 0) {
      console.log('✅ Found in DB');
      return res.json({
        source: 'database',
        data: dbResult.rows[0],
      });
    }

    console.log('❌ Not found → calling OpenAI');

    // ✅ 2. CALL OPENAI
   
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Return ONLY valid JSON. No explanation.'
          },
          {
            role: 'user',
            content: `Give JSON for ${softwareName}:
{
  "software_name": "",
  "developer": "",
  "category": "",
  "license_type": "",
  "license_name": "",
  "primary_language": "",
  "platform": "",
  "capability": "",
  "similar_software": "",
  "status": ""
}`
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();

    // 🚨 DEBUG (IMPORTANT)
    console.log('AI RAW RESPONSE:', JSON.stringify(aiData, null, 2));

    if (!aiData.choices) {
      return res.status(500).json({
        error: 'OpenAI failed',
        details: aiData
      });
    }

    let content = aiData.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.log('❌ JSON parse failed');
      parsed = { raw: content };
    }

    // ✅ 3. SAVE TO DB (SAFE)
    if (parsed.software_name) {
      await pool.query(
        `INSERT INTO software_genome 
        (software_name, developer, software_category, license_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING`,
        [
          parsed.software_name,
          parsed.developer || null,
          parsed.category || null,
          parsed.license_type || null
        ]
      );
    }

    return res.json({
      source: 'openai',
      data: parsed,
    });

  } catch (err) {
    console.error('🔥 ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});