// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
const DEFAULT_AGENT_NAME = 'AI-Worker'
const DEFAULT_AGENT_DESCRIPTION =
  'Autonomous AI Agent that runs in a web worker thread'

const typedef = `/**
  * @typedef {Object} ResponseFormat
  * @property {Object} thoughts - Your thought response as an object
  * @property {string} thoughts.text - What do you want to say to the user?
  * @property {string} thoughts.reasoning - Why do you want to say this?
  * @property {string} thoughts.progress - A detailed list of everything you have done so far
  * @property {string} thoughts.plan - A short bulleted list that conveys a long-term plan
  * @property {string} thoughts.speak - Thoughts summary to say to the user
  * @property {Object} command - Next command in your plan as an object
  * @property {string} command.name - Command name
  * @property {Array<Object.<string, string>>} command.args - Arguments for the command (key-value pairs)
  */`

const _DEFAULT_RESPONSE_FORMAT = {
  thoughts: {
    text: 'What do you want to say to the user?',
    reasoning: 'Why do you want to say this?',
    progress: 'A detailed list of everything you have done so far',
    plan: 'A short bulleted list that conveys a long-term plan',
    speak: 'thoughts summary to say to user',
  },
  command: {
    name: 'next command in your plan',
    args: [{ arg_name: 'value' }],
  },
}

const DEFAULT_RESPONSE_FORMAT = `Only respond in the JSON output format described below.
${typedef}

Ensure that your response can be parsed in JavaScript using "JSON.parse()" into the type definition described above." 

RESPOND ONLY IN THIS JSON OUTPUT FORMAT:
${JSON.stringify(_DEFAULT_RESPONSE_FORMAT)}
`

const NEXT_PROMPT = `INSTRUCTIONS:
1. Check the progress of your goals.
2. If you have achieved all your goals, execute the "task_complete" command IMMEDIATELY. Otherwise,
3. Plan your next command based on previous system message responses to work towards your goals.
4. Use only available commands.
5. Aim to complete tasks in the fewest steps possible, as commands are expensive.
6. Confirm a command's execution only if a system message acknowledges it.
7. Don't assume a command is executed just because it was in your plan.
8. Save useful information from previous command outputs to a file, if applicable.
9. Utilize your long-term memory instead of retrieving or analyzing information you already have.
10. Execute the "do_nothing" command ONLY if no other command is available.
11. Ensure commands are executed with supported arguments.
12. If a command is unavailable, select an alternative command from the options provided.

${DEFAULT_RESPONSE_FORMAT}
`

const INIT_PROMPT = `Do the following:
1. Execute the next best command to achieve the goals.
2. Execute the "do_nothing" command if there is no other command to execute.
3. ${DEFAULT_RESPONSE_FORMAT}
`

const AgentStates = {
  START: 'START',
  IDLE: 'IDLE',
  TOOL_STAGED: 'TOOL_STAGED',
  STOP: 'STOP',
}

/**
 * @typedef {object} keyConfig
 * @property {object} keys
 * @property {{ googleApiKey: string; googleCxId: string; }} keys.google
 * @property {object} keys.openai
 * @property {string} keys.openai.apiKey
 */

/**
 * Constructor function for creating a KeyConfig object.
 * @constructor
 * @param {string} googleApiKey - The Google API key.
 * @param {string} googleCxId - The Google CX ID.
 * @param {string} openaiApiKey - The OpenAI API key.
 */
class KeyConfig {
  /**
   * @param {string} googleApiKey
   * @param {string} googleCxId
   * @param {string} openaiApiKey
   */
  constructor(googleApiKey, googleCxId, openaiApiKey) {
    this.keys = {
      google: {
        googleApiKey,
        googleCxId,
      },
      openai: {
        apiKey: openaiApiKey,
      },
    }
  }
}

module.exports = {
  DEFAULT_AGENT_NAME,
  DEFAULT_AGENT_DESCRIPTION,
  DEFAULT_RESPONSE_FORMAT,
  NEXT_PROMPT,
  INIT_PROMPT,
  AgentStates,
  KeyConfig,
}
