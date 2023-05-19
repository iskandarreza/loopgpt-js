/**
 * Abstract base class for tools.
 */
class BaseTool {
  /**
   * We need to pass in a string for the identifier, because minification will destroy the class name 
   * and so we cannot rely on `this.constructor.name`
   * @param {string} identifier
   */
  constructor(identifier) {
    this.toolName = identifier
    /**
     * @type {string|undefined}
     */
  }
  /**
   * Unique identifier for the tool.
   * @type {string}
   */
  get id() {
    return this.toolName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  /**
   * Description of the tool.
   * @type {string}
   */
  get desc() {
    return this.toolName.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /**
   * Dictionary of arguments for the tool.
   * @type {Object.<string, string>}
   */
  get args() {
    throw new Error('Not implemented');
  }

  /**
   * Response format of the tool.
   * @type {Object.<string, string>}
   */
  get resp() {
    throw new Error('Not implemented');
  }

  /**
   * Returns the tool information as a JSON string.
   * @returns {string} The JSON string representation of the tool.
   */
  prompt() {
    return JSON.stringify({
      name: this.id,
      description: this.desc,
      args: this.args,
      response_format: this.resp,
    });
  }

  /**
   * Returns the configuration object for the tool.
   * @returns {Object} The configuration object.
   */
  config() {
    return {
      class: this.toolName,
      type: 'tool',
    };
  }

  /**
   * Creates an instance of the tool from its configuration.
   * @param {Object} config - The configuration object.
   * @returns {BaseTool} An instance of the tool.
   */
  // static fromConfig(config) {
  //   return new this(config.name);
  // }
}


module.exports = BaseTool