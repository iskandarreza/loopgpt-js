// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
const DEFAULT_AGENT_NAME = 'AI-Worker'
const DEFAULT_AGENT_DESCRIPTION =
  'Autonomous AI Agent that runs in a web worker thread'

const typedef = `/**
 * @typedef {Object} ResponseFormat
 * @property {Object} thoughts
 * @property {string} thoughts.text - What do you want to say to the user?
 * @property {string} thoughts.reasoning - Why do you want to say this?
 * @property {string} thoughts.progress - A detailed list of everything you have done so far
 * @property {string} thoughts.plan - A short bulleted list that conveys a long-term plan
 * @property {string} thoughts.speak - Thoughts summary to say to the user
 * @property {Object} command
 * @property {string} command.name - Next command in your plan
 * @property {Array<Object.<string, string>>} command.args - Arguments for the command (key-value pairs)
 */`

const _DEFAULT_RESPONSE_FORMAT = {
  thoughts: {
    text: 'What do you want to say to the user?',
    reasoning: 'Why do you want to say this?',
    progress: '- A detailed list\n - of everything you have done so far',
    plan: '- short bulleted\n- list that conveys\n- long-term plan',
    speak: 'thoughts summary to say to user',
  },
  command: {
    name: 'next command in your plan',
    args: {
      arg_name: 'value',
    },
  },
}

const DEFAULT_RESPONSE_FORMAT =
  'You should only respond in JSON format as described below \nResponse Format:\n' +
  JSON.stringify(_DEFAULT_RESPONSE_FORMAT, null, 2) +
  '\n' +
  `The type definition looks like this:\n` +
  typedef +
  '\n' +
  'Ensure the response can be parsed by JavaScript JSON.parse()\n'

const NEXT_PROMPT =
  'INSTRUCTIONS:\n' +
  '1 - Check the progress of your goals.\n' +
  '2 - If you have achieved all your goals, execute the "task_complete" command IMMEDIATELY. Otherwise,\n' +
  '3 - Use the command responses in previous system messages to plan your next command to work towards your goals\n' +
  '4 - Only use available commmands.\n' +
  '5 - Commands are expensive. Aim to complete tasks in the least number of steps.\n' +
  '6 - A command is considered executed only if it is confirmed by a system message.\n' +
  '7 - A command is not considered executed just becauses it was in your plan.\n' +
  '8 - Remember to use the output of previous command. If it contains useful information, save it to a file.\n' +
  '9 - Do not use commands to retrieve or analyze information you already have. Use your long term memory instead.\n' +
  '10 - Execute the "do_nothing" command ONLY if there is no other command to execute.\n' +
  '11 - Make sure to execute commands only with supported arguments.\n' +
  '12 - If a command is not available, select an alternative command from the available options.\n' + // added extra directive
  DEFAULT_RESPONSE_FORMAT +
  '\n'

const INIT_PROMPT =
  'Do the following:\n' +
  '1 - Execute the next best command to achieve the goals.\n' +
  '2 - Execute the "do_nothing" command if there is no other command to execute.\n' +
  '3 - ONLY RESPOND IN THE FOLLOWING FORMAT: (MAKE SURE THAT IT CAN BE DECODED WITH JAVACRIPT JSON.parse())\n' +
  DEFAULT_RESPONSE_FORMAT +
  '\n'

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
