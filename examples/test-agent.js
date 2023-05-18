const loopgpt = require('../dist/index')
const { Agent, OpenAIModel, Tools } = loopgpt;

const tools = new Tools()
const toolsInfo = tools.browsingTools().reduce((accumulator, tool) => {
  accumulator.push(new tool().prompt());
  return accumulator;
}, []);

const apiKey = "OPENAI-API-KEY"
const apiUrl = 'https://api.openai.com/v1/chat/completions'

const agent = new Agent({
  model: new OpenAIModel('gpt-3.5-turbo', apiKey, apiUrl),
  tools: [
    ...tools.browsingTools()
  ],
  goals: [
    'Assist the user in developing tools commands for the autonomous AI agent that is based on a LLM model, that would work in a webworker environment.',
    `The following tools are currently available:\n ${toolsInfo}`
  ]
})

const chat = async () => {
  const response = await agent.chat({ run_tool: true })
  console.log(response)
}

chat()