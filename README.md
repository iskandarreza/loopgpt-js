A Javascript implementation of the `loopgpt` Python module by Fariz Rahman - https://github.com/farizrahman4u/loopgpt

Add to your node project:
```bash
npm install loopgpt-js
```

Usage example:
```js
const loopgpt = require("loopgpt-js");
const { Agent, AgentStates, LocalMemory, OpenAIEmbeddingProvider, OpenAIModel } = loopgpt;

const init = async () => {
  // example startup
  const apiKey = 'YOUR-OPENAI-API-KEY'
  const apiUrl = 'https://api.openai.com/v1/chat/completions'

  const agent = new Agent({
    model: new OpenAIModel('gpt-3.5-turbo', apiKey, apiUrl),
    embedding_provider: new OpenAIEmbeddingProvider(),
    temperature: 0.8,
    memory: new LocalMemory(),
    history: [],
    goals: [],
    progress: [],
    plan: [],
    constraints: [],
    state: AgentStates.START,
  })

  console.log({agent})

  const response = await agent.chat({ message: "Hello! Please state your capabilites and provide the output in markdown." })
  console.log(response)
}

init()
```
