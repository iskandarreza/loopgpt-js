const loopgpt = require('../src/index.js')
const { Tools } = loopgpt

const tools = new Tools()

async function testTool() {
  const googleApiKey = 'GOOGLE_API_KEY'
  const googleCxId = 'CUSTOM_SEARCH_ENGINE_ID'
  const browsingTools = tools.browsingTools({ googleApiKey, googleCxId })
  const scraper = new browsingTools[1]()
  const search = new browsingTools[0]()

  const searchResults = await search.run('California wildflowers')
  const scraperResults = await scraper.run({
    url: 'https://www.cnps.org/conservation/california-wildflowers',
    question: 'Why are wildflowers important?',
  })

  console.log(JSON.stringify(searchResults, null, 4))
  console.log({ scraperResults })
}

testTool()
