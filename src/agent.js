// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
const { OpenAIModel } = require("./openAIModel.js");
const {
  AgentStates,
  DEFAULT_AGENT_DESCRIPTION,
  DEFAULT_AGENT_NAME,
  DEFAULT_RESPONSE_FORMAT,
  INIT_PROMPT,
  NEXT_PROMPT
} = require("./constants.js");

const { LocalMemory } = require("./localMemory.js");
const { OpenAIEmbeddingProvider } = require("./openAIEmbeddingProvider.js");

/**
 * @typedef {Object} AgentConfig
 * @property {string} [name]
 * @property {string} [description]
 * @property {string[]} [goals]
 * @property {OpenAIModel} [model]
 * @property {*} [embedding_provider]
 * @property {number} [temperature]
 */

// /**
//  * @typedef {Object} OpenAIModel
//  * @property {Function} chat - Async method for conducting a chat conversation.
//  * @property {Function} countTokens - Method for counting the number of tokens in a text string.
//  * @property {Function} getTokenLimit - Method for getting the token limit of the model.
//  * @property {Function} config - Method for getting the configuration of the model.
//  */


/**
 * Creates an instance of a LoopGPT Agent class
 * @date 5/16/2023 - 9:24:36 AM
 *
 * @class Agent
 * @typedef {Agent}
 */
// @ts-ignore
class Agent {
  /**
   * Creates an instance of a LoopGPT Agent.
   * @date 5/16/2023 - 9:24:36 AM
   *
   * @constructor
   * @param {AgentConfig} config
   */
  constructor({
    name = DEFAULT_AGENT_NAME,
    description = DEFAULT_AGENT_DESCRIPTION,
    goals = undefined,
    model = undefined,
    embedding_provider = null,
    temperature = 0.8,
  } = {}) {
    this.name = name
    this.description = description
    this.goals = goals || []
    this.model = model || new OpenAIModel('gpt-3.5-turbo')
    this.embedding_provider =
      embedding_provider || new OpenAIEmbeddingProvider()
    this.temperature = temperature
    this.memory = new LocalMemory({
      embedding_provider: this.embedding_provider,
    })
    /**
     * @type {{ role: string; content: any; }[]}
     */
    this.history = []
    this.init_prompt = INIT_PROMPT
    this.next_prompt = NEXT_PROMPT
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
    /**
     * @type {{ [s: string]: any; } | ArrayLike<any>}
     */
    this.tools = []
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
   * @returns An object with two properties: "full_prompt" which is an array of messages to be
   * displayed to the user, and "token_count" which is the number of tokens used by the messages in the
   * "full_prompt" array.
   */
  getFullPrompt(user_input = '') {
    const header = { role: 'system', content: this.headerPrompt() }
    const dtime = {
      role: 'system',
      content: `The current time and date is ${new Date().toLocaleString()}`,
    }
    const msgs = this._getNonUserMessages(10)
    const relevant_memory = this.memory.get(msgs.toString(), 5)
    const user_prompt = user_input
      ? [{ role: 'user', content: user_input }]
      : []
    const history = this.getCompressedHistory()

    const _msgs = () => {
      const msgs = [header, dtime]
      msgs.push(...history.slice(0, -1))
      if (relevant_memory.length) {
        const memstr = relevant_memory.join('\n')
        const context = {
          role: 'system',
          content: `You have the following items in your memory as a result of previously executed commands:\n${memstr}\n`,
        }
        msgs.push(context)
      }
      msgs.push(...history.slice(-1))
      msgs.push(...user_prompt)
      return msgs
    }

    const maxtokens = this.model.getTokenLimit() - 1000
    let ntokens = 0
    while (true) {
      const msgs = _msgs()
      ntokens += this.model.countTokens(msgs)
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

    return { full_prompt: _msgs(), token_count: ntokens }
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
      } catch (e) {}
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

    const { full_prompt, token_count } = this.getFullPrompt(message)
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

    let parsedResp = resp.choices[0].message.content

    try {
      parsedResp = await this.loadJson(parsedResp)
      let plan = await parsedResp.thoughts.plan

      if (plan && Array.isArray(plan)) {
        if (
          plan.length === 0 ||
          (plan.length === 1 && plan[0].replace('-', '').length === 0)
        ) {
          this.staging_tool = { name: 'task_complete', args: {} }
          this.staging_response = parsedResp
          this.state = AgentStates.STOP
        }
      } else {
        if (typeof parsedResp === 'object') {
          if ('name' in parsedResp) {
            parsedResp = { command: parsedResp }
          }
          if (parsedResp.command) {
            this.staging_tool = parsedResp.command
            this.staging_response = parsedResp
            this.state = AgentStates.TOOL_STAGED
          } else {
            this.state = AgentStates.IDLE
          }
        } else {
          this.state = AgentStates.IDLE
        }
      }

      const progress = await parsedResp.thoughts?.progress
      if (progress) {
        if (typeof plan === 'string') {
          this.progress.push(progress)
        } else if (Array.isArray(progress)) {
          this.progress.push(...progress)
        }
      }

      this.plan = await parsedResp.thoughts?.plan
      if (plan) {
        if (typeof plan === 'string') {
          this.plan = [plan]
        } else if (Array.isArray(plan)) {
          this.plan = plan
        }
      }
    } catch {}

    this.history.push({ role: 'user', content: message })
    this.history.push({
      role: 'assistant',
      content:
        typeof parsedResp === 'object'
          ? JSON.stringify(parsedResp)
          : await parsedResp,
    })

    return await parsedResp
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
    // if (this.tools.length > 0) {
    //   prompt.push(this.toolsPrompt());
    // }
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
    const token_count = this.model.countTokens(message)
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
  runStagingTool() {
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

    if (this.tools && typeof this.tools === 'object') {
      for (const [k, tool] of Object.entries(this.tools)) {
        if (k === toolId) {
          found = true
          break
        }
      }
    }

    if (!found) {
      // Updated response
      const resp = `The command "${toolId}" is not available. Please choose a different command.`
      this.history.push({
        role: 'system',
        content: resp,
      })
      return resp
    }

    try {
      // @ts-ignore
      const tool = this.tools[toolId]
      const resp = tool.run(kwargs)
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
  Agent
}