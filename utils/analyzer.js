const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

exports.analyze = async (input) => {

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are a software genome analyzer. Give structured analysis like categories, architecture, complexity, and purpose."
            },
            {
                role: "user",
                content: `Analyze this software or code:\n${input}`
            }
        ]
    });

    return {
        analysis: response.choices[0].message.content
    };
};