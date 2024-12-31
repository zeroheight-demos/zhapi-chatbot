# zhapi-chatbot

This is a demo project for a chatbot that queries Pinecone and OpenAI to provide responses based on a design system documentation site.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Pinecone API key
- OpenAI API key
- Zeroheight API credentials

## Setup

1. Clone the repository:

```
sh
git clone https://github.com/zeroheight-demos/zhapi-chatbot.git
cd zhapi-chatbot
```

2. Install the dependencies:

`npm install`

3. Create a .env file in the root directory and add your API keys:

```
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-pinecone-index-name
PINECONE_URL=your-pinecone-url
OPENAI_API_KEY=your-openai-api-key
API_KEY=your-zeroheight-api-key
API_CLIENT=your-zeroheight-api-client
STYLEGUIDE_ID=your-styleguide-id
```
4. Run the script to fetch data from Zeroheight and format it:

`node fetchFromZeroheight.js`

5. Push the formatted data to Pinecone:

`node pushToPinecone.js`

6. Start the server:

`node app.js`

7. Open your browser and navigate to http://localhost:3000 to interact with the chatbot.

## Files

* app.js: Main server file that handles chat queries.
* fetchFromZeroheight.js: Script to fetch and format data from Zeroheight.
* pushToPinecone.js: Script to push formatted data to Pinecone.
* index.html: Frontend for interacting with the chatbot.

## License

This project is licensed under the MIT License.