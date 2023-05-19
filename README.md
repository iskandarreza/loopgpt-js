A Javascript implementation of the `loopgpt` Python module by Fariz Rahman - https://github.com/farizrahman4u/loopgpt

Add to your node project:

```bash
npm install loopgpt-js
```

Usage example:

```js
const loopgpt = require('loopgpt-js')
const { Agent } = loopgpt

async function initLoop() {
  // you could save the api key(s) on a server and fetch it when needed
  const apiKeyResponse = await fetch('/api/openai', {
    method: 'POST'
  })

  const { apiKey } = await apiKeyResponse.json()

  const apiUrl = 'https://api.openai.com/v1/chat/completions'

  // or you could pass it in directly
  const keys = {
    openai: { apiKey, apiUrl },
    google: {
      googleApiKey: 'GOOGLE_API_KEY',
      googleCxId: 'CUSTOM_SEARCH_ENGINE_ID'
    }
  }

  // Create a new instance of the Agent class
  const agent = new Agent({
    keys: keys,
    goals: [
      'Run the web_search command for "California wildflowers" and then produce an overview of your findings with descriptions of each flower and their native area,'
    ]
  })

  const chat = async () => {
    let response
    response = await agent.chat({ message: null })

    while (response?.command?.name !== 'task_complete') {
      response = await agent.chat({ run_tool: true })
      console.log(agent)
      console.log(response)
    }
  }

  chat()
}

initLoop()
```
