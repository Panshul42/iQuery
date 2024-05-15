const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require('dotenv').config();
const cors = require('cors');
const { createWriteStream } = require('fs');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const OpenAI = require('openai');
const PDFParse = require('pdf-parse');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getSearch(inp) {
    const msg = `You are an AI language model that takes in an academic text and boils it down to a concise search term. This search term, when keyed into Google, should return websites with content most closely related to the academic text. Please provide a search term that is as closely related to the input text as possible and within 30 words. Input text: ${inp}`;
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: `${msg}`}],
        model: "gpt-3.5-turbo",
        max_tokens: 700,
      });
    
    return (completion.choices[0].message.content);
}

async function runPrompt(inp) {
    const msg = `You are an AI language model that summarizes academic texts for 15-year olds. Your task is to summarize the following body of text to approximately 25% of its original length. Most importantly, the summary must be easy to understand for 15-year olds. Structure the summary logically with appropriate headings, subheadings, and bullet points. You can have additional key points when necessary.

    ---
    
    ${inp}
    
    ---
    
    Please format your summary as follows:

    <h2>Introduction</h2>
    <ul>
        <li>[Key point 1]</li>
        <li>[Key point 2]</li>
    </ul>
    
    <h2>Key Results</h2>
    
    <h4>Subheading 1</h4>
    <ul>
        <li>[Key finding 1]</li>
        <li>[Key finding 2]</li>
    </ul>
    
    <h4>Subheading 2</h4>
    <ul>
        <li>[Key finding 1]</li>
        <li>[Key finding 2]</li>
    </ul>
    
    <h2>Conclusion</h2>
    <ul>
        <li>[Conclusion point 1]</li>
        <li>[Conclusion point 2]</li>
    </ul>
    `;
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: `${msg}`}],
        model: "gpt-3.5-turbo",
        max_tokens: 3024,
      });
    
    return (completion.choices[0].message.content);
}

async function askQuestion(inp, question) {
    const msg = `You are an AI language model that answers questions to 15-year old students based on the provided information. Use the following body of text to answer the question in a concise manner. Use HTML tags only to format your result.

    Body of text:
    
    ---
    
    ${inp}
    
    ---
    
    Question: ${question}
    
    Structure the answer logically with appropriate headings, subheadings, and bullet points using HTML tags.
    `;
    
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: msg }],
        model: "gpt-3.5-turbo",
        max_tokens: 2000,
    });
    
    return completion.choices[0].message.content;
}
const app = express();
const port = 5050;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));


app.post("/summarize", async (req, res) => {
    try {
        let result = await runPrompt(req.body.input.text); 
        let addition = await Search(await getSearch(req.body.input.text));
        res.json({result: result, related: addition.googleResults + addition.youtubeResults}); 
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/question", async (req, res) => {
    try {
        const result = await askQuestion(req.body.input.context, req.body.input.question); 
        res.send(result); 
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        const data = req.file.buffer;

        // Use pdf-parse to extract text content from the PDF file
        const pdfData = await PDFParse(data);
        const text = pdfData.text;

        // Send the 'text' variable as the response
        const result = await runPrompt(text); 
        let s = await getSearch(text);
        let addition = await Search(s);
        res.json({response: result, context: text, related: addition.googleResults + addition.youtubeResults}); 
      } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send({ message: 'Error uploading file' });
      }
});

async function Search(query) {
    try {
        const googleResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: process.env.GOOGLE_API_KEY,
                cx: process.env.GOOGLE_SEARCH_CX,
                q: query,
                num: 2
            }
        });

        const youtubeResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                key: process.env.GOOGLE_API_KEY,
                q: query,
                part: 'snippet',
                maxResults: 1
            }
        });

        // console.log(googleResponse.data); // Log the full response data for debugging

        if (!googleResponse.data.items) {
            throw new Error('No items found in the response data');
        }

        const googleResults = googleResponse.data.items.map(item => `
            <a href="${item.link}" style="font-size: 1.2em;">${item.title}</a>
            <p>${item.snippet}</p>
        `).join('');

        const youtubeResults = youtubeResponse.data.items.map(item => `
            <a href="https://www.youtube.com/watch?v=${item.id.videoId}" style="font-size: 1.2em;">${item.snippet.title}</a>
            <p>${item.snippet.description}</p>
            <img src="${item.snippet.thumbnails.default.url}" alt="${item.snippet.title}" />
        `).join('');

        return {googleResults: googleResults, youtubeResults: youtubeResults};

    } catch (error) {
        // Log detailed error information
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
            console.error("Error Response Status:", error.response.status);
            console.error("Error Response Headers:", error.response.headers);
        } else if (error.request) {
            console.error("Error Request Data:", error.request);
        } else {
            console.error("Error Message:", error.message);
        }
        console.error("Error Config:", error.config);

        return [];
    }
}

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
  