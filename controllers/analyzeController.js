const fs = require("fs");
const analyzer = require("../utils/analyzer");
const pool = require("../db/db");

exports.analyzeCode = async (req, res) => {
    try {
        const filePath = req.file.path;
        const code = fs.readFileSync(filePath, "utf-8");

        // 🔥 THIS LINE HERE
        const result = await analyzer.analyze(code);

        // Save to DB
        await pool.query(
            "INSERT INTO reports (software_name, software_type, analysis) VALUES ($1, $2, $3)",
            [
                req.body.softwareName,
                req.body.softwareType,
                result
            ]
        );

        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Analysis failed" });
    }
};