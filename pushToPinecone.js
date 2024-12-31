const fs = require('fs');
const axios = require('axios');
const { OpenAI } = require('openai');

const PINECONE_API_KEY = '{PINECONE_API_KEY}'; // Add your Pinecone API key
const PINECONE_INDEX_NAME = '{PINECONE_INDEX_NAME}'; // Add your Pinecone index name

const OPENAI_API_KEY = '{OPENAI_API_KEY}'; // Add your OpenAI API key

const PINECONE_URL = `{PIENCONE_URL}/vectors/upsert`; // Pinecone API URL. Replace {PINECONE_URL} with your Pinecone URL (found on your dashboard)


const pushToPinecone = async () => {
  console.log('Starting script...');

  try {
    // Step 1: Read input file
    console.log('Reading input file...');
    const rawData = fs.readFileSync('formattedResponse.json', 'utf8');
    const data = JSON.parse(rawData);
    console.log(`Loaded ${data.length} records from file.`);

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Step 2: Generate embeddings and push individually to Pinecone
    console.log('Processing each record...');
    for (const item of data) {
      try {
        console.log(`Generating embedding for item ID: ${item.id}`);
        const response = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: item.content || '', // Use empty string if content is missing
        });
        const embedding = response.data[0].embedding;

        const vector = {
          vectors: [
            {
              id: String(item.id), // Convert ID to string
              values: embedding,
              metadata: {
                name: item.name,
                url: item.url,
                tabName: item.tabName,
                content: item.content, // Store the original text as metadata
              },
            },
          ],
        };

        console.log(`Pushing vector for item ID: ${item.id} to Pinecone...`);
        const upsertResponse = await axios.post(PINECONE_URL, vector, {
          headers: {
            'Api-Key': PINECONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });
        console.log(`Successfully pushed item ID: ${item.id}. Response:`, upsertResponse.data);
      } catch (error) {
        console.error(`Error processing item ID: ${item.id}:`, error.message);
        if (error.response?.data) {
          console.error('Detailed error response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('All records processed.');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
};

pushToPinecone();