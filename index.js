import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { load } from "cheerio";

const app = express();
const PORT = 5000;

dotenv.config();
app.use(cors());
app.use(bodyParser.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ✅ UPDATED: Contribution count function with User-Agent
async function getContributionCount(username) {
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          query {
            user(login: "${username}") {
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                }
              }
            }
          }
        `,
      }),
    });

    const data = await response.json();

    const total = data.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions;

    console.log("📈 Total Contributions via GraphQL:", total);
    return total ?? 0;
  } catch (err) {
    console.error(" GraphQL error:", err.message);
    return null;
  }
}


app.post("/api/review", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "GitHub username is required" });
  }

  try {
    // Get contributions
    const contributions = await getContributionCount(username);
console.log(contributions)
    // Fetch repos
    const repoRes = await fetch(`https://api.github.com/users/${username}/repos`, {
      headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
    });

    if (!repoRes.ok) {
      const errorData = await repoRes.json();
      return res.status(repoRes.status).json({
        error: errorData.message || "Failed to fetch GitHub repos",
      });
    }

    const repos = await repoRes.json();

    const topRepos = repos
      .slice(0, 5)
      .map((repo, index) => {
        return `${index + 1}. ${repo.name} - ${
          repo.description || "No description"
        } - Tech: ${repo.language || "Unknown"}`;
      })
      .join("\n");

    const prompt = `
Starting me profile picture achi hai yesi tarif karo 😅 badhme joke marna acha to direct soul ko touch ho.
Ek aisi GitHub profile review likhni hai jo bindass, seedhi aur full-on hinglish style me ho 😎. Review ki starting ek funny joke ya punchline se karo 😂 jisse reader ka mood ban jaye.
dont said ki joke sune? like this direct tell jock related to coder and developer
Sundar Pichai ka bachpan ka code: if (IndianMom == angry) then run(); 🏃‍♂️😂
Ya fir Mark Zuckerberg bolta – "Main Facebook banaya, lekin is bande ki repo dekh ke privacy chhodke sab kuch leak ho gaya!" 😬💻 is type ke alag alag joke dena har alag alag username ke liye
Is bande ke ${contributions ?? "kuch"} contributions hain — matlab banda contribution calendar me green square barsa raha hai ya bas nimbu soda pee raha hai, yeh tu decide kar 😂💻

Uske baad agar GitHub profile me kaafi achi repositories hain aur technologies achhi use hui hain, to us user ki dhamakedaar tareef karo — jaise "bhai tu to sach me coding ka baap nikla", ya "AI bhi tujhse training maang raha hoga" type 😅🔥.

Lekin agar profile me faltu ya random type repos hain, technologies weak hain ya real-world application nahi dikh raha, to seedha roast karo 👊 — jaise "bhai tu GitHub pe code daalne aaya tha ya selfie?", ya "kya kar raha hai bhai, isse achha to TikTok video daal de!" 😬💣

Niche diye gaye repositories ka analysis do:  
Kaun si technology use hui hai (React, Node, C++, etc.), uska kaam kya hai aur real-world me use kaha ho sakta hai 💡. Har repo ke liye short 2-3 line likhni hai jo bataye ki wo useful hai ya bekaar 🚀🔥

Language Hinglish (Roman Hindi + English mix) me ho jese "Isme Express.js use hua hai, matlab backend ekdum tez aur reliable ban gaya hai!" type. Beech beech me cool emojis use karo ✨😎💻

Motivational lines bhi kabhi kabhi daalo — jaise "Sacha coder kabhi Github repo chhota nahi banata!" ya "Kal kisne dekha? Aaj code likh bhai!" 💪🔥

Review approx 300 words ka ho. Style thoda funny, thoda inspiring, thoda savage ho — ekdum engaging jisse banda padhte hi ya to smile kare ya sochne lage 🔥🧠

Yeh rahe repositories:\n${topRepos}
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiData.candidates || !geminiData.candidates[0]) {
      throw new Error("Invalid Gemini API response");
    }

    const reviewText = geminiData.candidates[0].content.parts[0].text;
    res.json({ review: reviewText });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      error: "Failed to generate review",
      details: err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("🔥 GitHub Reviewer Backend is live!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
