import { Agent } from "./agent.js";
import { AgentStates } from "./constants.js";
import { LocalMemory } from "./localMemory.js";
import { OpenAIEmbeddingProvider } from "./openAIEmbeddingProvider.js";
import { OpenAIModel } from "./openaimodel.js";


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

  const response = await agent.chat({ message: "Hello! Please state your capabilites and provide the output in markdown." })
  console.log(response)
}

init()