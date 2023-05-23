// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
const { OpenAIModel } = require('./openAIModel.js')
const {
  AgentStates,
  DEFAULT_AGENT_DESCRIPTION,
  DEFAULT_AGENT_NAME,
  DEFAULT_RESPONSE_FORMAT,
  INIT_PROMPT,
  NEXT_PROMPT,
} = require('./constants.js')

const { LocalMemory } = require('./memory/localMemory.js')
const { OpenAIEmbeddingProvider } = require('./embeddings/openai.js')
const { Tools } = require('./tools.js')
const BaseTool = require('./tools/baseToolClass.js')
const optimizeContext = require('./utils/optimizeContext.js')
const isBalanced = require('./utils/isBalanced.js')

/**
 * @typedef {object} keyConfig
 * @property {{ googleApiKey: string; googleCxId: string; }} google
 * @property {{ apiKey: string; }} openai
 */
class Agent {
  /**
   * @type {keyConfig}
   */
  #keys // hold keys in this private prop

  /**
   * @type {BaseTool[]} tools
   */
  #tools

  /**
   * Creates an instance of a LoopGPT Agent.
   * @class Agent
   * @constructor
   * @param {object} config - The configuration object for initializing the Agent class.
   * @param {keyConfig} config.keys - The keys object containing model-related keys.
   * @param {string} [config.name] - The name of the agent. (optional)
   * @param {string} [config.description] - The description of the agent. (optional)
   * @param {string[]} [config.goals] - The goals associated with the agent. (optional)
   * @param {number} [config.init_prompt] - The init prompt with general operating instructions for generating responses. (optional)
   * @param {number} [config.next_prompt] - The next prompt for evaluating responses and generating next responses. (optional)
   * @param {OpenAIModel} [config.model] - The OpenAI model for the agent. (optional)
   * @param {{name: string; description: string; args: object; response_format: object;}} [config.tools] - The tools associated with the agent. (optional)
   * @param {*} [config.embedding_provider] - The embedding provider for the agent. (optional)
   * @param {number} [config.temperature] - The temperature value for generating responses. (optional)
   */
  constructor(config) {
    this.#keys = config.keys
    this.name = config.name || DEFAULT_AGENT_NAME
    this.description = config.description || DEFAULT_AGENT_DESCRIPTION
    this.goals = config.goals || []

    const openaiApiKey = this.#keys.openai.apiKey
    this.model =
      new OpenAIModel(openaiApiKey, 'gpt-3.5-turbo') ||
      config.model ||
      undefined
    this.temperature = config.temperature || 0.8
    this.embedding_provider =
      config.embedding_provider || new OpenAIEmbeddingProvider(openaiApiKey)
    this.memory = this.memory || new LocalMemory(this.embedding_provider)
    /**
     * @type {{ role: string; content: any; }[]}
     */
    this.history = []
    this.init_prompt = config.init_prompt || INIT_PROMPT || undefined
    this.next_prompt = config.next_prompt || NEXT_PROMPT || undefined
    /**
     * @type {any[]}
     */
    this.progress = []
    /**
     * @type {any[]}
     */
    this.plan = []
    /**
     * @type {string | any[]}
     */
    this.constraints = []
    this.state = AgentStates.START

    this.#tools = [...new Tools().browsingTools(this.#keys)]

    /**
     * @type {BaseTool[]}
     */
    const toolsInfo = this.#tools.reduce((accumulator, tool) => {
      // @ts-ignore
      accumulator.push(JSON.parse(new tool().prompt()))
      return accumulator
    }, [])

    this.tools = toolsInfo || []
  }

  /**
   * @param {BaseTool[]} tools
   */
  set _tools(tools) {
    this.#tools = tools
  }

  /**
   * This function takes in two boolean parameters and returns a modified configuration object with
   * compressed history.
   * @param {boolean} [init_prompt=false] - A boolean value indicating whether or not to include the initial
   * prompt in the configuration object.
   * @param {boolean} [next_prompt=false] - The "next_prompt" parameter is a boolean value that determines
   * whether or not a prompt should be displayed for the next input after the initial input. If set to
   * "true", a prompt will be displayed for each subsequent input. If set to "false", no prompt will be
   * displayed for subsequent inputs.
   * @returns {Agent} The `config` object with the `init_prompt` and `next_prompt` properties removed if their
   * corresponding arguments are `false`, and with the `history` property set to the compressed history
   * obtained from the `getCompressedHistory()` method.
   */
  config(init_prompt = false, next_prompt = false) {
    const clone = { ...this }

    if (!init_prompt) {
      delete clone.init_prompt
    }
    if (!next_prompt) {
      delete clone.next_prompt
    }
    clone.history = this.getCompressedHistory()
    return clone
  }

  /**
   * This function returns the last n non-user messages from a chat history, excluding any system
   * messages that contain the phrase "do_nothing".
   * @param {number} n - The number of non-user messages to retrieve from the chat history.
   * @returns This function returns an array of the last n non-user messages from the chat history,
   * excluding any system messages that contain the phrase "do_nothing".
   */
  _getNonUserMessages(n) {
    const msgs = this.history.filter((msg) => {
      return (
        msg.role !== 'user' &&
        !(msg.role === 'system' && msg.content.includes('do_nothing'))
      )
    })
    return msgs.slice(-n - 1, -1)
  }

  /**
   * This function generates a full prompt for a chatbot conversation, including system messages, user
   * input, and relevant memory.
   * @param {string} [user_input] - The user's input, which is an optional parameter. If provided, it will be
   * added to the prompt as a user message.
   * @returns {Promise<{full_prompt: Array<{role: string; content: string;}>; token_count: number;}>} 
   * - An object with two properties: "full_prompt" which is an array of messages to be
   * displayed to the user, and "token_count" which is the number of tokens used by the messages in the
   * "full_prompt" array.
   */
  async getFullPrompt(user_input = '') {
    const maxtokens = this.model.getTokenLimit() - 1000

    const header = { role: 'system', content: this.headerPrompt() }
    const dtime = {
      role: 'system',
      content: `The current time and date is ${new Date().toLocaleString()}`,
    }
    const msgs = this._getNonUserMessages(10)
    const user_prompt = user_input
      ? [{ role: 'user', content: user_input }]
      : []

    let relevant_memory = await this.memory.get(JSON.stringify(msgs), 5)
    let history = this.getCompressedHistory()

    const _msgs = async () => {
      const msgs = [header, dtime]
      let optimizedHistory
      msgs.push(...history.slice(0, -1))
      if (relevant_memory.length) {
        const uniqueMemory = [...new Set(relevant_memory)] // Remove duplicates
        const memstr = uniqueMemory.join('\n')
        const context = {
          role: 'system',
          content: `You have the following items in your memory as a result of previously executed commands:\n${memstr}\n`,
        }
        msgs.push(context)
      }
      msgs.push(...history.slice(-1))

      optimizedHistory = await optimizeContext([...msgs], maxtokens)
      optimizedHistory.push(...user_prompt)

      console.log({ optimizedHistory })
      return optimizedHistory
    }

    let ntokens = 0
    while (true) {
      const msgs = await _msgs()
      ntokens = 0
      ntokens += await this.model.countPromptTokens(msgs)
      if (ntokens < maxtokens) {
        break
      } else {
        if (history.length > 1) {
          history.shift()
        } else if (relevant_memory.length) {
          relevant_memory.shift()
        } else {
          break
        }
      }
    }

    console.debug({ full_prompt: await _msgs(), token_count: ntokens })

    return { full_prompt: await _msgs(), token_count: ntokens }
  }

  /**
   * This function returns a compressed version of a chat history by removing certain properties from
   * assistant messages.
   * @returns The function `getCompressedHistory()` returns a modified version of the `history` array
   * of messages. The modifications include removing all messages with the role of "user" and removing
   * certain properties from the `thoughts` object of any messages with the role of "assistant". The
   * modified `history` array is then returned.
   */
  getCompressedHistory() {
    let hist = this.history.slice()
    // @ts-ignore
    let system_msgs = hist.reduce((indices, msg, i) => {
      if (msg.role === 'system') {
        // @ts-ignore
        indices.push(i)
      }
      return indices
    }, [])
    /**
     * @type {(string | number)[]}
     */
    let assist_msgs = hist.reduce((indices, msg, i) => {
      if (msg.role === 'assistant') {
        // @ts-ignore
        indices.push(i)
      }
      return indices
    }, [])
    assist_msgs.forEach((/** @type {string | number} */ i) => {
      // @ts-ignore
      let entry = Object.assign({}, hist[i])
      try {
        let respd = JSON.parse(entry.content)
        let thoughts = respd.thoughts
        if (thoughts) {
          delete thoughts.reasoning
          delete thoughts.speak
          delete thoughts.text
          delete thoughts.plan
        }
        entry.content = JSON.stringify(respd, null, 2)
        // @ts-ignore
        hist[i] = entry
      } catch (e) { }
    })
    /**
     * @type {number[]}
     */
    let user_msgs = hist.reduce((indices, msg, i) => {
      if (msg.role === 'user') {
        // @ts-ignore
        indices.push(i)
      }
      return indices
    }, [])
    hist = hist.filter((_msg, i) => {
      return !user_msgs.includes(i)
    })
    return hist
  }

  /**
   * This function returns a message with a prompt based on the current state of an agent.
   * @param {string|null} message - The message parameter is a string that represents the user's input or response to
  the agent's prompt. It is an optional parameter that can be passed to the getFullMessage function.
   * @returns The function `getFullMessage` is returning a string that includes either the
  `init_prompt` or `next_prompt` property of the current object instance, followed by a new line and
  the `message` parameter (if provided).
   */
  getFullMessage(message) {
    if (this.state === AgentStates.START) {
      return `${this.init_prompt}\n\n${message || ''}`
    } else {
      return `${this.next_prompt}\n\n${message || ''}`
    }
  }

  /**
   * @typedef {Object} ChatObject
   * @property {string|null} [message]
   * @property {boolean} [run_tool]
   */

  /**
   * This is a function for a chatbot agent that processes user messages, runs staging tools, and
   * generates responses using a language model.
   * @param {ChatObject} chatObject
   * @returns the parsed response from the model's chat method, which is either an object or a string.
   */
  async chat({ message = null, run_tool = false }) {
    if (this.state === AgentStates.STOP) {
      throw new Error(
        'This agent has completed its tasks. It will not accept any more messages. You can do `agent.clear_state()` to start over with the same goals.'
      )
    }

    message = this.getFullMessage(message)

    if (this.staging_tool) {
      const tool = this.staging_tool
      if (run_tool) {
        const output = await this.runStagingTool()
        this.tool_response = output

        if (tool.name === 'task_complete') {
          this.history.push({
            role: 'system',
            content: 'Completed all user specified tasks.',
          })
          this.state = AgentStates.STOP
          return
        }

        if (tool.name !== 'do_nothing') {
          // TODO: We don't have enough space for this in GPT-3
          // this.memory.add(
          //   `Command "${tool.name}" with args ${tool.args} returned :\n ${output}`
          // );
        }
      } else {
        this.history.push({
          role: 'system',
          content: `User did not approve running ${tool.name || tool}.`,
        })
        // this.memory.add(
        //   `User disapproved running command "${tool.name}" with args ${tool.args} with following feedback\n: ${message}`
        // );
      }

      this.staging_tool = null
      this.staging_response = null
    }

    const { full_prompt, token_count } = await this.getFullPrompt(message)
    const token_limit = this.model.getTokenLimit()
    // @ts-ignore
    const max_tokens = Math.min(1000, Math.max(token_limit - token_count, 0))
    assert(max_tokens, {
      message: `Token limit of ${token_limit} exceeded`,
      token_count,
    })

    // Check if tool not available, and if agent is trying to use the unavailable tool again, assert as user
    let remindAgent = false
    let modifiedPrompt = [...full_prompt]
    if (
      typeof this.tool_response === 'string' &&
      this.tool_response.includes(
        'is not available. Please choose a different command.'
      )
    ) {
      let lastResponse
      for (let i = modifiedPrompt.length - 1; i >= 0; i--) {
        if (modifiedPrompt[i].role === 'assistant') {
          lastResponse = JSON.parse(modifiedPrompt[i].content)
          break
        }
      }

      let toolId = lastResponse?.command?.name || 'unknown tool'

      if (toolId === this.staging_tool?.name) {
        const remindAsUser = {
          role: 'user',
          content: `Reminder: The tool "${toolId}" is not available. Please choose a different command.`,
        }

        // Find the index of the last user message
        let lastUserIndex = -1
        for (let i = modifiedPrompt.length - 1; i >= 0; i--) {
          if (modifiedPrompt[i].role === 'user') {
            lastUserIndex = i
            break
          }
        }

        if (lastUserIndex !== -1) {
          // Replace the last user message with the modified message
          modifiedPrompt[lastUserIndex] = remindAsUser
          remindAgent = true
        }
      }
    }

    const resp = await this.model.chat(
      !remindAgent ? full_prompt : modifiedPrompt,
      {
        max_tokens,
        temperature: this.temperature,
      }
    )

    let reply
    let error
    let usage
    // try {

    if (resp?.choices) {
      reply = resp.choices[0].message.content
      if (resp.usage && resp.usage.total_tokens) {
        let total_tokens = resp.usage.total_tokens
        console.log({
          token_count,
          usage: resp.usage,
          diffPercentage: Math.round(
            ((total_tokens - token_count) / total_tokens) * 100
          ),
        })
      }
      console.log({ reply })
    }

    if (resp?.error) {
      error = resp.error
      console.error({ error })
    }

    if (resp?.usage) {
      usage = resp.usage
      console.info({ usage })
    }

    if (reply) {
      let thoughts
      let plan
      let progress
      let command

      try {
        if (isBalanced(reply)) {
          reply = JSON.parse(reply)
          console.log('JSON.parse()', { reply })
        } else {
          console.info('Reply JSON not balanced.')
          try {
            console.info('Attempting to balance curly braces')
            if (typeof reply === 'string') {
              let trimmed = reply.substring(0, reply.length - 1)
              reply = JSON.parse(trimmed)
            }
          } catch (error) {
            console.error('Unable to balance JSON reply', { error, reply })
          }
        }
      } catch (error) {
        const errMsg = 'Unable to JSON.parse() reply'
        console.error(errMsg, error)

        // Try other ways to parse the reply
        try {
          reply = await this.loadJson(reply)
        } catch (error) {
          const errMsg = 'Unable to loadJson(reply)'
          console.error(errMsg, error)
        }
      }

      thoughts = await reply?.thoughts
      plan = await thoughts?.plan
      progress = await thoughts?.progress
      command = await reply.command

      console.log({ plan })
      console.log({ progress })

      if (command) {
        this.staging_tool = command
        this.staging_response = reply
        this.state = AgentStates.TOOL_STAGED
      } else {
        this.state = AgentStates.IDLE
      }

      if (plan) {
        if (typeof plan === 'string') {
          this.plan = [plan]
        } else if (Array.isArray(plan)) {
          this.plan = plan
        }
      }

      if (plan && Array.isArray(plan)) {
        if (
          plan.length === 0 ||
          (plan.length === 1 && plan[0].replace('-', '').length === 0)
        ) {
          this.staging_tool = { name: 'task_complete', args: {} }
          this.staging_response = reply
          this.state = AgentStates.STOP
        }
      }
      if (progress) {
        if (typeof plan === 'string') {
          this.progress.push(progress)
        } else if (Array.isArray(progress)) {
          this.progress.push(...progress)
        }
      }

      this.history.push({ role: 'user', content: message })

      return await reply
    } else {
      let errorResp
      if (resp?.error) {
        const { error } = resp
        let { message, type, code, param } = error || {}

        if (type === 'server_error') {
          // handle server error
          if (
            message
              .toLowerCase()
              .includes('currently overloaded with other requests')
          ) {
            // attempt retry in `n` seconds
          }
        }

        if (code === 'context_length_exceeded') {
          // handle context length exceeded
        }

        if (type === 'tokens') {
          if (message.toLowerCase().includes('"rate limit')) {
            throw Error(message)
          }
        }

        errorResp = {
          role: 'system',
          content: JSON.stringify({
            error: {
              message: message && message,
              type: type && type,
              code: code && code,
              param: param && param,
            },
          }),
        }

        if (message === 'Critical error, threads should be ended') {
          throw Error(message)
        }
      } else {
        errorResp = { role: 'system', content: 'Unhandled error' }
      }

      !!errorResp && console.error(errorResp)

      return errorResp || resp
    }
  }

  /**
   * The function returns a string prompt based on the persona, goals, constraints, plan, and progress
   * of a project.
   * @returns The `headerPrompt()` function is returning a string that includes prompts for the
   * persona, goals, constraints, plan, and progress, joined together with line breaks.
   */
  headerPrompt() {
    const prompt = []
    prompt.push(this.personaPrompt())
    if (this.#tools.length > 0) {
      prompt.push(this.toolsPrompt())
    }
    if (this.goals.length > 0) {
      prompt.push(this.goalsPrompt())
    }
    if (this.constraints.length > 0) {
      prompt.push(this.constraintsPrompt())
    }
    if (this.plan?.length > 0) {
      prompt.push(this.planPrompt())
    }
    if (this.progress.length > 0) {
      prompt.push(this.progressPrompt())
    }
    return prompt.join('\n') + '\n'
  }

  /**
   * The function returns a string that includes the name and description of a person.
   * @returns The function `personaPrompt()` is returning a string that includes the name and
   * description of the object that the function is called on. The specific values of `this.name` and
   * `this.description` will depend on the object that the function is called on.
   */
  personaPrompt() {
    return `You are ${this.name}, ${this.description}.`
  }

  /**
   * The function generates a progress prompt by iterating through a list of completed tasks and
   * displaying them in a formatted string.
   * @returns The `progressPrompt()` function is returning a string that lists the progress made so
   * far. The string includes a header "PROGRESS SO FAR:" and a numbered list of tasks that have been
   * completed, with each item in the list formatted as "DONE - [task description]". The items in the
   * list are separated by newline characters.
   */
  progressPrompt() {
    let prompt = []
    prompt.push('PROGRESS SO FAR:')
    for (let i = 0; i < this.progress.length; i++) {
      prompt.push(`${i + 1}. DONE - ${this.progress[i]}`)
    }
    return prompt.join('\n') + '\n'
  }

  /**
   * The function returns a string that displays the current plan.
   * @returns The `planPrompt()` method is returning a string that includes the current plan joined
   * together with new line characters and preceded by the text "CURRENT PLAN:".
   */
  planPrompt() {
    let plan = this.plan.join('\n')
    return `CURRENT PLAN:\n${plan}\n`
  }

  /**
   * The function generates a prompt displaying a list of goals.
   * @returns The `goalsPrompt()` function is returning a string that lists the goals of an object,
   * with each goal numbered and separated by a newline character.
   */
  goalsPrompt() {
    let prompt = []
    prompt.push('GOALS:')
    for (let i = 0; i < this.goals.length; i++) {
      prompt.push(`${i + 1}. ${this.goals[i]}`)
    }
    return prompt.join('\n') + '\n'
  }

  /**
   * The function generates a prompt message listing the constraints.
   * @returns The function `constraintsPrompt()` returns a string that lists the constraints of an
   * object, with each constraint numbered and separated by a new line character.
   */
  constraintsPrompt() {
    let prompt = []
    prompt.push('CONSTRAINTS:')
    for (let i = 0; i < this.constraints.length; i++) {
      prompt.push(`${i + 1}. ${this.constraints[i]}`)
    }
    return prompt.join('\n') + '\n'
  }

  /**
   * Displays the prompt for selecting tools.
   * @returns {string} The tool prompt.
   */
  toolsPrompt() {
    const prompt = ['Commands:']

    for (let i = 0; i < this.#tools.length; i++) {
      // @ts-ignore
      const tool = new this.#tools[i]()
      tool.agent = this
      prompt.push(`${i + 1}. ${tool.prompt()}`)
    }

    const taskCompleteCommand = {
      name: 'task_complete',
      description:
        'Execute when all tasks are completed. This will terminate the session.',
      args: {},
      responseFormat: { success: 'true' },
    }

    const doNothingCommand = {
      name: 'do_nothing',
      description: 'Do nothing.',
      args: {},
      responseFormat: { response: 'Nothing Done.' },
    }

    prompt.push(
      `${this.#tools.length + 1}. ${taskCompleteCommand.name}: ${taskCompleteCommand.description
      }`
    )

    prompt.push(
      `${this.#tools.length + 2}. ${doNothingCommand.name}: ${doNothingCommand.description
      }`
    )

    return prompt.join('\n') + '\n'
  }

  /**
   * The function attempts to parse a string as JSON, and if it fails, it may try to extract the JSON
   * using GPT or return the original string.
   * @param {string} s - The input string that contains the JSON data to be parsed.
   * @param {boolean} [try_gpt] - A boolean parameter that indicates whether to try extracting JSON using
  GPT if the initial parsing fails. If set to true, the function will attempt to extract JSON using
  GPT if the initial parsing fails. If set to false, the function will not attempt to extract JSON
  using GPT.
   * @returns The `loadJson` function returns a parsed JSON object if the input string is in valid JSON
  format, or a string representation of the input if it cannot be parsed as JSON. If the input
  cannot be parsed as JSON and the `try_gpt` parameter is `true`, the function will attempt to
  extract JSON using a GPT model and retry parsing. If parsing still fails, an error is
   */
  // @ts-ignore
  async loadJson(s, try_gpt = true) {
    console.debug('loadJson(reply)', { reply: s })

    try {
      if (s.includes('Result: {')) {
        s = s.split('Result: ')[0]
      }
      if (!s.includes('{') || !s.includes('}')) {
        throw new Error('Invalid JSON format')
      }

      try {
        return JSON.parse(s)
      } catch (error) {
        s = s.substring(s.indexOf('{'), s.lastIndexOf('}') + 1)

        try {
          return JSON.parse(s)
        } catch (error) {
          try {
            s = s.replace(/\n/g, ' ')
            return s
          } catch (error) {
            try {
              return `${s}}`
            } catch (error) {
              // Retry with GPT extraction
              if (try_gpt) {
                s = await this.extractJsonWithGpt(s)
                try {
                  return s
                } catch (error) {
                  return this.loadJson(s, false)
                }
              }
              throw new Error('Unable to parse JSON')
            }
          }
        }
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * The function extracts a JSON string from a given string using GPT.
   * @param {any} s - The input string that needs to be converted to a JSON string.
   * @returns The function `extractJsonWithGpt` is returning the result of calling `this.model.chat`
  with the provided arguments. The result of this call is not shown in the code snippet, but it is
  likely a Promise that resolves to the response generated by the GPT model.
   */
  async extractJsonWithGpt(s) {
    const func = `function convertToJson(response) {
      // Implement the logic to convert the given string to a JSON string
      // of the desired format
      // Ensure the result can be parsed by JSON.parse
      // Return the JSON string
    }`

    const desc = `Convert the given string to a JSON string of the form
  ${JSON.stringify(DEFAULT_RESPONSE_FORMAT, null, 4)}
  Ensure the result can be parsed by JSON.parse.`

    const args = [s]

    const msgs = [
      {
        role: 'system',
        content: `You are now the following JavaScript function:\n\n${func}\n\nOnly respond with your 'return' value.`,
      },
      { role: 'user', content: args.join(', ') },
    ]

    // @ts-ignore
    const token_count = await this.model.countPromptTokens(message)
    const token_limit = this.model.getTokenLimit()
    // @ts-ignore
    const max_tokens = Math.min(1000, Math.max(token_limit - token_count, 0))

    return this.model.chat({
      messages: msgs,
      temperature: 0.0,
      max_tokens,
    })
  }

  /**
   * The function runs a staging tool with specified arguments and returns the result or an error
   * message.
   * @returns The function `runStagingTool()` returns different responses depending on the conditions
   * met in the code. It can return a string response or an object response depending on the command
   * and arguments provided. The specific response returned is indicated in the code comments.
   */
  async runStagingTool() {
    if (!this.staging_tool.hasOwnProperty('name')) {
      const resp =
        'Command name not provided. Make sure to follow the specified response format.'
      this.history.push({
        role: 'system',
        content: resp,
      })
      return resp
    }

    const toolId = this.staging_tool.name
    const args = this.staging_tool.args || {}

    if (toolId === 'task_complete') {
      const resp = { success: true }
      this.history.push({
        role: 'system',
        content: `Command "${toolId}" with args ${JSON.stringify(
          args
        )} returned:\n${JSON.stringify(resp)}`,
      })
      return resp
    }

    if (toolId === 'do_nothing') {
      const resp = { response: 'Nothing Done.' }
      this.history.push({
        role: 'system',
        content: `Command "${toolId}" with args ${JSON.stringify(
          args
        )} returned:\n${JSON.stringify(resp)}`,
      })
      return resp
    }

    if (!this.staging_tool.hasOwnProperty('args')) {
      const resp =
        'Command args not provided. Make sure to follow the specified response format.'
      this.history.push({
        role: 'system',
        content: resp,
      })
      return resp
    }

    const kwargs = this.staging_tool.args
    let found = false

    if (this.#tools) {
      for (const [k, tool] of Object.entries(this.#tools)) {
        const identifier = tool.identifier
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toLowerCase()
        if (identifier === toolId) {
          found = true
          break
        }
      }
    }

    if (!found) {
      const resp = `The command "${toolId}" is not available. Please choose a different command.`
      this.history.push({
        role: 'system',
        content: resp,
      })
      return resp
    }

    try {
      // @ts-ignore
      const tool = this.#tools.find(
        (_tool) =>
          _tool.identifier.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() ===
          toolId
      )
      // @ts-ignore
      const resp = await new tool(this).run(kwargs)
      this.history.push({
        role: 'system',
        content: `Command "${toolId}" with args ${JSON.stringify(
          args
        )} returned:\n${JSON.stringify(resp)}`,
      })
      return resp
    } catch (e) {
      const resp = `Command "${toolId}" failed with error: ${e}`
      this.history.push({
        role: 'system',
        content: resp,
      })
      return resp
    }
  }
}

/**
 * The function is an assertion helper that throws an error if a condition is not met.
 * @param {number} condition - The condition is a boolean expression that is being tested for truthiness. If the
condition is false, an error will be thrown.
 * @param {{ message: string; token_count: number; }} message - The message parameter is an optional parameter that can be passed to the assert
function. It is a string or any other data type that represents the error message that will be
thrown if the condition parameter is false. If no message is provided, a default error message will
be thrown.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(JSON.stringify(message) || 'Assertion failed')
  }
}

module.exports = {
  Agent,
}
