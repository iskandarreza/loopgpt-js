declare module "openAIModel" {
    export type maxTokens = {
        max_tokens?: number | undefined;
        temperature?: number | undefined;
    };
    /**
     * @typedef {Object} maxTokens
     * @property {number} [max_tokens]
     * @property {number} [temperature]
     */
    export class OpenAIModel {
        /**
         * This function returns a new OpenAIModel object using the model and apiKey specified in the config
         * parameter.
         * @param {{ model: string | undefined; apiKey: string | undefined; }} config - The `config` parameter is an object that contains the configuration information
        needed to create a new `OpenAIModel` instance. It has two properties:
         * @returns A new instance of the `OpenAIModel` class with the `model` and `apiKey` properties set to
        the values provided in the `config` object.
         */
        static fromConfig(config: {
            model: string | undefined;
            apiKey: string | undefined;
        }): OpenAIModel;
        /**
         * This is a constructor function that initializes an OpenAI chatbot with a specified model and API
         * key.
         * @param {string} [model=gpt-3.5-turbo] - The model parameter is a string that specifies the OpenAI language
         * model to use for generating responses. In this case, the default value is 'gpt-3.5-turbo', but it
         * can be changed to any other supported model.
         * @param {string|null} [apiKey=null] - The API key is a unique identifier that allows access to a specific OpenAI
         * API. It is required to make API requests and authenticate the user.
         * @param {string} [apiUrl] - The `apiUrl` parameter is a string that represents the URL of the OpenAI API
         * endpoint that will be used to make requests for chat completions. If this parameter is not
         * provided, the default URL `https://api.openai.com/v1/chat/completions` will be used.
         */
        constructor(model?: string | undefined, apiKey?: string | null | undefined, apiUrl?: string | undefined);
        getApiKey(): string;
        /**
         * @param {string} value
         */
        setApiKey(value: string): void;
        model: string;
        /**
         * @type {string}
         */
        apiUrl: string;
        /**
         * This is an async function that sends a POST request to an API endpoint with specified parameters
         * and returns the response data.
         * @param {any} messages - An array of strings representing the conversation history or prompt for the
        chatbot to generate a response to.
         * @param {maxTokens} [maxTokens] - The maximum number of tokens (words) that the API should generate in
        response to the given messages. If not provided, the API will use its default value.
         * @param {number} [temperature] - The temperature parameter controls the "creativity" of the AI-generated
        responses. A higher temperature value will result in more diverse and unpredictable responses,
        while a lower temperature value will result in more conservative and predictable responses. The
        default value is 0.8.
         * @returns the result of the API call made using the provided parameters (messages, maxTokens, and
        temperature) after handling any errors that may occur during the API call.
         */
        chat(messages: any, maxTokens?: maxTokens | undefined, temperature?: number | undefined): Promise<any>;
        /**
         * @type {maxTokens | undefined}
         */
        max_tokens: maxTokens | undefined;
        temperature: number | undefined;
        /**
         * The function counts the number of tokens in a set of messages based on the selected language
         * model.
         * @param {any} messages - An array of objects representing messages, where each object has properties such
        as "name" and "text".
         * @returns the total number of tokens in the messages array, based on the model being used.
         */
        countTokens(messages: any): number;
        /**
         * The function returns the token limit for a specific language model.
         * @returns {number} The function `getTokenLimit()` returns the token limit for a specific language model
         * based on the value of `this.model`. The token limit is returned as an integer value.
         */
        getTokenLimit(): number;
        /**
         * The function returns an object with the model and apiKey properties.
         * @returns An object with two properties: "model" and "apiKey", both of which are being accessed
         * from the current object using "this".
         */
        config(): {
            model: string;
            apiKey: string;
        };
        #private;
    }
}
declare module "constants" {
    export const DEFAULT_AGENT_NAME: "AI-Worker";
    export const DEFAULT_AGENT_DESCRIPTION: "Autonomous AI Agent that runs in a web worker thread";
    export const DEFAULT_RESPONSE_FORMAT: string;
    export const NEXT_PROMPT: string;
    export const INIT_PROMPT: string;
    export namespace AgentStates {
        const START: string;
        const IDLE: string;
        const TOOL_STAGED: string;
        const STOP: string;
    }
}
declare module "localMemory" {
    export class LocalMemory {
        /**
         * This is a constructor function that initializes an empty array for documents and a null value for
         * embeddings, and takes an embedding provider as a parameter.
         * @param embeddingProvider - The `embeddingProvider` parameter is a variable that holds a reference
         * to an object or function that provides word embeddings. Word embeddings are a way to represent
         * words as numerical vectors, which can be used in natural language processing tasks such as text
         * classification, language translation, and sentiment analysis. The `embeddingProvider
         */
        constructor(embeddingProvider: any);
        docs: any[];
        embs: any[] | null;
        embeddingProvider: any;
        /**
         * The function adds a document to a list and creates an embedding for it if necessary.
         * @param doc - The document to be added to the list of documents.
         * @param [key=null] - The key parameter is an optional argument that can be passed to the add()
         * function. If a key is provided, it will be used to generate an embedding for the document. If no
         * key is provided, the document itself will be used as the key.
         */
        add(doc: any, key?: null | undefined): void;
        /**
         * The function takes a query and a number k, calculates the similarity scores between the query and
         * a set of embeddings, sorts the scores in descending order, and returns the top k documents based
         * on the highest scores.
         * @param query - The query is a vector representation of the search query that the user inputs. It
         * is used to find the most relevant documents from a collection of documents.
         * @param k - The number of top results to return.
         * @returns an array of documents that are most similar to the given query, based on their
         * embeddings. The number of documents returned is determined by the value of the parameter `k`.
         */
        get(query: any, k: any): any[];
        /**
         * This function serializes an array of embeddings into an object with dtype, data, and shape
         * properties.
         * @returns The function `_serializeEmbs()` is returning an object with three properties: `dtype`,
         * `data`, and `shape`. The `dtype` property is a string representing the name of the constructor of
         * the first element in the `embs` array. The `data` property is an array of arrays, where each inner
         * array is a copy of the corresponding array in the `embs` array
         */
        _serializeEmbs(): {
            dtype: any;
            data: any[][];
            shape: any[];
        } | null;
        /**
         * The function clears an array and sets a variable to null.
         */
        clear(): void;
    }
}
declare module "openAIEmbeddingProvider" {
    export class OpenAIEmbeddingProvider {
        /**
         * This function returns a new instance of the OpenAIEmbeddingProvider class using the model and
         * apiKey specified in the config parameter.
         * @param config - The `config` parameter is an object that contains the configuration information
         * needed to create a new `OpenAIEmbeddingProvider` instance. It has two properties:
         * @returns A new instance of the `OpenAIEmbeddingProvider` class with the `model` and `apiKey`
         * properties set to the values provided in the `config` object.
         */
        static fromConfig(config: any): OpenAIEmbeddingProvider;
        /**
         * This is a constructor function that initializes an object with a model and an API key.
         * @param [model=text-embedding-ada-002] - The model parameter is a string that represents the name
         * or identifier of a text embedding model. This model is used to convert text data into numerical
         * vectors that can be used for various natural language processing tasks such as sentiment analysis,
         * text classification, and language translation.
         * @param [apiKey=null] - The apiKey parameter is a string that represents an API key that may be
         * required to access certain resources or services. It is set to null by default, which means that
         * the code may not require an API key to function properly.
         */
        constructor(model?: string | undefined, apiKey?: null | undefined);
        model: string;
        apiKey: any;
        /**
         * This is an asynchronous function that retrieves embeddings for a given text using the OpenAI API.
         * @param text - The input text for which embeddings are to be generated.
         * @returns A Float32Array containing the embeddings of the input text.
         */
        get(text: any): Promise<Float32Array>;
        /**
         * The function returns an object with the model and apiKey properties.
         * @returns The `config()` function is returning an object with two properties: `model` and `apiKey`.
         * The values of these properties are being taken from the `model` and `apiKey` properties of the
         * object that the function is a method of.
         */
        config(): {
            model: string;
            apiKey: any;
        };
    }
}
declare module "agent" {
    export type AgentConfig = {
        name?: string | undefined;
        description?: string | undefined;
        goals?: string[] | undefined;
        model?: OpenAIModel | undefined;
        embedding_provider?: any;
        temperature?: number | undefined;
    };
    /**
     * @typedef {Object} AgentConfig
     * @property {string} [name]
     * @property {string} [description]
     * @property {string[]} [goals]
     * @property {OpenAIModel} [model]
     * @property {*} [embedding_provider]
     * @property {number} [temperature]
     */
    /**
     * Creates an instance of a LoopGPT Agent class
     * @date 5/16/2023 - 9:24:36 AM
     *
     * @class Agent
     * @typedef {Agent}
     */
    export class Agent {
        /**
         * Creates an instance of a LoopGPT Agent.
         * @date 5/16/2023 - 9:24:36 AM
         *
         * @constructor
         * @param {AgentConfig} config
         */
        constructor({ name, description, goals, model, embedding_provider, temperature, }?: AgentConfig);
        name: string;
        description: string;
        goals: string[];
        model: OpenAIModel;
        embedding_provider: any;
        temperature: number;
        memory: LocalMemory;
        /**
         * @type {{ role: string; content: any; }[]}
         */
        history: {
            role: string;
            content: any;
        }[];
        init_prompt: string;
        next_prompt: string;
        /**
         * @type {any[]}
         */
        progress: any[];
        /**
         * @type {any[]}
         */
        plan: any[];
        /**
         * @type {string | any[]}
         */
        constraints: string | any[];
        state: string;
        /**
         * @type {{ [s: string]: any; } | ArrayLike<any>}
         */
        tools: ArrayLike<any> | {
            [s: string]: any;
        };
        /**
         * This function returns the last n non-user messages from a chat history, excluding any system
         * messages that contain the phrase "do_nothing".
         * @param {number} n - The number of non-user messages to retrieve from the chat history.
         * @returns This function returns an array of the last n non-user messages from the chat history,
         * excluding any system messages that contain the phrase "do_nothing".
         */
        _getNonUserMessages(n: number): {
            role: string;
            content: any;
        }[];
        /**
         * This function generates a full prompt for a chatbot conversation, including system messages, user
         * input, and relevant memory.
         * @param {string} [user_input] - The user's input, which is an optional parameter. If provided, it will be
         * added to the prompt as a user message.
         * @returns An object with two properties: "full_prompt" which is an array of messages to be
         * displayed to the user, and "token_count" which is the number of tokens used by the messages in the
         * "full_prompt" array.
         */
        getFullPrompt(user_input?: string | undefined): {
            full_prompt: {
                role: string;
                content: string;
            }[];
            token_count: number;
        };
        /**
         * This function returns a compressed version of a chat history by removing certain properties from
         * assistant messages.
         * @returns The function `getCompressedHistory()` returns a modified version of the `history` array
         * of messages. The modifications include removing all messages with the role of "user" and removing
         * certain properties from the `thoughts` object of any messages with the role of "assistant". The
         * modified `history` array is then returned.
         */
        getCompressedHistory(): {
            role: string;
            content: any;
        }[];
        /**
         * This function returns a message with a prompt based on the current state of an agent.
         * @param {string|null} message - The message parameter is a string that represents the user's input or response to
        the agent's prompt. It is an optional parameter that can be passed to the getFullMessage function.
         * @returns The function `getFullMessage` is returning a string that includes either the
        `init_prompt` or `next_prompt` property of the current object instance, followed by a new line and
        the `message` parameter (if provided).
         */
        getFullMessage(message: string | null): string;
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
        chat({ message, run_tool }: {
            message?: string | null | undefined;
            run_tool?: boolean | undefined;
        }): Promise<any>;
        tool_response: any;
        staging_tool: any;
        staging_response: any;
        /**
         * The function returns a string prompt based on the persona, goals, constraints, plan, and progress
         * of a project.
         * @returns The `headerPrompt()` function is returning a string that includes prompts for the
         * persona, goals, constraints, plan, and progress, joined together with line breaks.
         */
        headerPrompt(): string;
        /**
         * The function returns a string that includes the name and description of a person.
         * @returns The function `personaPrompt()` is returning a string that includes the name and
         * description of the object that the function is called on. The specific values of `this.name` and
         * `this.description` will depend on the object that the function is called on.
         */
        personaPrompt(): string;
        /**
         * The function generates a progress prompt by iterating through a list of completed tasks and
         * displaying them in a formatted string.
         * @returns The `progressPrompt()` function is returning a string that lists the progress made so
         * far. The string includes a header "PROGRESS SO FAR:" and a numbered list of tasks that have been
         * completed, with each item in the list formatted as "DONE - [task description]". The items in the
         * list are separated by newline characters.
         */
        progressPrompt(): string;
        /**
         * The function returns a string that displays the current plan.
         * @returns The `planPrompt()` method is returning a string that includes the current plan joined
         * together with new line characters and preceded by the text "CURRENT PLAN:".
         */
        planPrompt(): string;
        /**
         * The function generates a prompt displaying a list of goals.
         * @returns The `goalsPrompt()` function is returning a string that lists the goals of an object,
         * with each goal numbered and separated by a newline character.
         */
        goalsPrompt(): string;
        /**
         * The function generates a prompt message listing the constraints.
         * @returns The function `constraintsPrompt()` returns a string that lists the constraints of an
         * object, with each constraint numbered and separated by a new line character.
         */
        constraintsPrompt(): string;
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
        loadJson(s: string, try_gpt?: boolean | undefined): any;
        /**
         * The function extracts a JSON string from a given string using GPT.
         * @param {any} s - The input string that needs to be converted to a JSON string.
         * @returns The function `extractJsonWithGpt` is returning the result of calling `this.model.chat`
        with the provided arguments. The result of this call is not shown in the code snippet, but it is
        likely a Promise that resolves to the response generated by the GPT model.
         */
        extractJsonWithGpt(s: any): Promise<any>;
        /**
         * The function runs a staging tool with specified arguments and returns the result or an error
         * message.
         * @returns The function `runStagingTool()` returns different responses depending on the conditions
         * met in the code. It can return a string response or an object response depending on the command
         * and arguments provided. The specific response returned is indicated in the code comments.
         */
        runStagingTool(): any;
    }
    import { OpenAIModel } from "openAIModel";
    import { LocalMemory } from "localMemory";
}
declare module "index" {
    import { Agent } from "agent";
    import { AgentStates } from "constants";
    import { LocalMemory } from "localMemory";
    import { OpenAIEmbeddingProvider } from "openAIEmbeddingProvider";
    import { OpenAIModel } from "openAIModel";
    export { Agent, AgentStates, LocalMemory, OpenAIEmbeddingProvider, OpenAIModel };
}
declare module "tools/baseToolClass" {
    /**
     * Abstract base class for tools.
     */
    export class BaseTool {
        /**
         * Creates an instance of the tool from its configuration.
         * @param {Object} config - The configuration object.
         * @returns {BaseTool} An instance of the tool.
         */
        static fromConfig(config: Object): BaseTool;
        /**
         * Unique identifier for the tool.
         * @type {string}
         */
        get id(): string;
        /**
         * Description of the tool.
         * @type {string}
         */
        get desc(): string;
        /**
         * Dictionary of arguments for the tool.
         * @type {Object.<string, string>}
         */
        get args(): {
            [x: string]: string;
        };
        /**
         * Response format of the tool.
         * @type {Object.<string, string>}
         */
        get resp(): {
            [x: string]: string;
        };
        /**
         * Returns the tool information as a JSON string.
         * @returns {string} The JSON string representation of the tool.
         */
        prompt(): string;
        /**
         * Returns the configuration object for the tool.
         * @returns {Object} The configuration object.
         */
        config(): Object;
    }
}
//# sourceMappingURL=index.d.ts.map