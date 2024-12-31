const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path'); // Add this for serving static files

const app = express();
const PORT = 3000;

// Configure Pinecone and OpenAI
const PINECONE_API_KEY = '{PINECONE_API_KEY}'; // Add your Pinecone API key
const PINECONE_INDEX_NAME = '{PINECONE_INDEX_NAME}'; // Add your Pinecone index name
const PINECONE_QUERY_URL = `{PIENCONE_URL}/query`; // Pinecone API URL. Replace {PINECONE_URL} with your Pinecone URL (found on your dashboard)

const OPENAI_API_KEY = '{OPENAI_API_KEY}'; // Add your OpenAI API key

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to handle chat queries
app.post('/query', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Step 1: Use OpenAI to generate a query embedding
    const embeddingResponse = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-ada-002',
        input: query,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const embedding = embeddingResponse.data.data[0].embedding;

    // Step 2: Query Pinecone with the embedding
    const pineconeResponse = await axios.post(
      PINECONE_QUERY_URL,
      {
        vector: embedding,
        topK: 5,
        includeMetadata: true,
      },
      {
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const matches = pineconeResponse.data.matches;

    if (!matches || matches.length === 0) {
      return res.json({ response: "I couldn't find any relevant information." });
    }

    // Step 3: Fit analysis and deduplication
    const SIMILARITY_THRESHOLD = 0.7;
    const filteredMatches = matches.filter((match) => match.score >= SIMILARITY_THRESHOLD);

    if (filteredMatches.length === 0) {
      return res.json({ response: "No highly relevant content was found for your query." });
    }

    const uniqueContent = new Map();
    filteredMatches.forEach((match) => {
      if (!uniqueContent.has(match.metadata.content)) {
        uniqueContent.set(match.metadata.content, {
          name: match.metadata.name,
          url: match.metadata.url,
        });
      }
    });

    const combinedContent = Array.from(uniqueContent.keys()).join('\n\n');
    const sourcesHtml = Array.from(uniqueContent.values())
      .map(
        (source) =>
          `<li><a href="${source.url}" target="_blank">${source.name}</a></li>`
      )
      .join('');

    // Step 4: Generate a summary using OpenAI
    const finalResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes content from a design system docuementation site for users. The site is the AirOrange Design System. The Airorange design system is a fictional design system for a fictional airline brand, that was built to show off the features of zeroheight, the desig system management platform.' },
          { role: 'user', content: `Summarize the following highly relevant content based on the query: "${query}".\n\n${combinedContent}. Return the content in a nicely formatted way, with a short introduction paragraph explaining what you've found in a conversational way with the user. Then chunk the findings into bullet points underneath, summarizing it to 3-5 bullet points that are the most useful. Use emojis if you want to.` },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    let summary = finalResponse.data.choices[0].message.content;

    // Step 5: Format the summary into HTML
    summary = formatSummary(summary);

    // Return the formatted response with sources
    res.json({
      response: `${summary}<h4>Sources:</h4><ul>${sourcesHtml}</ul>`,
    });
  } catch (error) {
    console.error('Error querying Pinecone or OpenAI:', error.message);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
});

// Helper function to format summary
function formatSummary(summary) {
  // Replace markdown **text** with <h3>
  summary = summary.replace(/\*\*(.*?)\*\*/g, '<h3>$1</h3>');

  // Replace markdown - items with <ul><li> items
  summary = summary.replace(/^- (.*)/gm, '<li>$1</li>');
  summary = summary.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

  // Remove duplicate <ul> tags for nested lists
  summary = summary.replace(/<\/ul>\s*<ul>/g, '');

  return summary;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
