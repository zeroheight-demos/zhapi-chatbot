const fs = require('fs');

// Replace API_KEY and API_CLIENT with your zeroheight API credentials
const headers = {
  'Accept': 'application/json',
  'X-API-KEY': '{API_KEY}',
  'X-API-CLIENT': '{API_CLIENT}'
};

// Replace STYLEGUIDE_ID with the ID of the styleguide you want to retrieve pages from
const styleguideId = '{STYLEGUIDE_ID}';

  const getPages = async () => {
    try {
      const response = await fetch(
        `https://zeroheight.com/open_api/v2/styleguides/${styleguideId}/pages`,
        {
          method: "GET",
          headers: headers
        }
      );
  
      if (!response.ok) {
        console.error('Error response:', response);
        return null;
      }
  
      const json = await response.json();
  
      if (!json || !json.data || !json.data.pages) {
        console.error('Error: Invalid response format');
        return null;
      }
  
      const pageIds = json.data.pages.map(page => page.id);
      console.log('Page IDs:', pageIds);
      return { pageIds };
  
    } catch (error) {
      console.error('Error fetching pages:', error);
      return null;
    }
  };

const getPageContent = (pageId) => {
  const url = `https://zeroheight.com/open_api/v2/pages/${pageId}?format=markdown`;
  console.log(`Fetching URL: ${url}`);
  return fetch(url, {
      method: "GET",
      headers: headers
    })
    .then((response) => {
      console.log(`Response status for ${pageId}: ${response.status}`);
      if (response.ok) {
        return response.json();
      } else { 
        console.error(`${pageId} skipped because of error ${response.status}`);
        return null;
      }    
    })
    .then((json) => {
      if (!json || !json.data.page) {
        console.error(`${pageId} skipped because of error ${json ? json.status : 'unknown'}`);
        return null;
      }
      const page = json.data.page;
      if (page.tabs) {
        return {
          name: page.name,
          url: page.url,
          tabs: page.tabs.map(tab => ({
            name: tab.name,
            content: tab.content
          }))
        };
      } else {
        return {
          name: page.name,
          url: page.url,
          content: page.content
        };
      }
    });
};

async function writePageContentsToFile() {
  const pages = await getPages();
  if (!pages || !pages.pageIds) {
    console.error('Error: getPages did not return a valid object with pageIds');
    return;
  }
  const { pageIds } = pages;
  const formattedContents = [];

  for (const pageId of pageIds) {
    const content = await getPageContent(pageId);
    
    //flatten the tabbed content to make it easier to process by Pinecone
    if (content) {
      if (content.tabs) {
        content.tabs.forEach(tab => {
          formattedContents.push({
            id: `${pageId}-${tab.name}`,
            name: content.name,
            url: content.url,
            tabName: tab.name,
            content: tab.content
          });
        });
      } else {
        formattedContents.push({
          id: pageId,
          name: content.name,
          url: content.url,
          content: content.content
        });
      }
    }
  }

  fs.writeFileSync('formattedResponse.json', JSON.stringify(formattedContents, null, 2));
}

// Call the function to execute it
writePageContentsToFile();