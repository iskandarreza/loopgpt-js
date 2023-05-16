// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
import { AgentStates, DEFAULT_AGENT_DESCRIPTION, DEFAULT_AGENT_NAME, DEFAULT_RESPONSE_FORMAT, INIT_PROMPT, NEXT_PROMPT } from "./constants.js";
import { LocalMemory } from "./localMemory.js";
import { OpenAIEmbeddingProvider } from "./openAIEmbeddingProvider.js";

export class Agent {
  constructor({
    name = DEFAULT_AGENT_NAME,
    description = DEFAULT_AGENT_DESCRIPTION,
    goals = null,
    model = null,
    embedding_provider = null,
    temperature = 0.8,
  } = {}) {
    this.name = name
    this.description = description
    this.goals = goals || []
    this.model = model || 'gpt-3.5-turbo'
    this.embedding_provider =
      embedding_provider || new OpenAIEmbeddingProvider()
    this.temperature = temperature
    this.memory = new LocalMemory({
      embedding_provider: this.embedding_provider,
    })
    this.history = []
    this.init_prompt = INIT_PROMPT
    this.next_prompt = NEXT_PROMPT
    this.progress = []
    this.plan = []
    this.constraints = []
    this.state = AgentStates.START
    this.tools = []
  }

  _getNonUserMessages(n) {
    const msgs = this.history.filter((msg) => {
      return (
        msg.role !== 'user' &&
        !(msg.role === 'system' && msg.content.includes('do_nothing'))
      )
    })
    return msgs.slice(-n - 1, -1)
  }

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

  getCompressedHistory() {
    let hist = this.history.slice()
    let system_msgs = hist.reduce((indices, msg, i) => {
      if (msg.role === 'system') {
        indices.push(i)
      }
      return indices
    }, [])
    let assist_msgs = hist.reduce((indices, msg, i) => {
      if (msg.role === 'assistant') {
        indices.push(i)
      }
      return indices
    }, [])
    assist_msgs.forEach((i) => {
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
        hist[i] = entry
      } catch (e) {}
    })
    let user_msgs = hist.reduce((indices, msg, i) => {
      if (msg.role === 'user') {
        indices.push(i)
      }
      return indices
    }, [])
    hist = hist.filter((msg, i) => {
      return !user_msgs.includes(i)
    })
    return hist
  }

  getFullMessage(message) {
    if (this.state === AgentStates.START) {
      return `${this.init_prompt}\n\n${message || ''}`
    } else {
      return `${this.next_prompt}\n\n${message || ''}`
    }
  }

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
    const token_limit = await this.model.getTokenLimit()
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

  personaPrompt() {
    return `You are ${this.name}, ${this.description}.`
  }

  progressPrompt() {
    let prompt = []
    prompt.push('PROGRESS SO FAR:')
    for (let i = 0; i < this.progress.length; i++) {
      prompt.push(`${i + 1}. DONE - ${this.progress[i]}`)
    }
    return prompt.join('\n') + '\n'
  }

  planPrompt() {
    let plan = this.plan.join('\n')
    return `CURRENT PLAN:\n${plan}\n`
  }

  goalsPrompt() {
    let prompt = []
    prompt.push('GOALS:')
    for (let i = 0; i < this.goals.length; i++) {
      prompt.push(`${i + 1}. ${this.goals[i]}`)
    }
    return prompt.join('\n') + '\n'
  }

  constraintsPrompt() {
    let prompt = []
    prompt.push('CONSTRAINTS:')
    for (let i = 0; i < this.constraints.length; i++) {
      prompt.push(`${i + 1}. ${this.constraints[i]}`)
    }
    return prompt.join('\n') + '\n'
  }

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
                s = await extractJsonWithGpt(s)
                try {
                  return s
                } catch (error) {
                  return loadJson(s, false)
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

    const token_count = this.model.countTokens(message)
    const token_limit = await this.model.getTokenLimit()
    const max_tokens = Math.min(1000, Math.max(token_limit - token_count, 0))

    return this.model.chat({
      messages: msgs,
      temperature: 0.0,
      max_tokens,
    })
  }

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(JSON.stringify(message) || 'Assertion failed')
  }
}
