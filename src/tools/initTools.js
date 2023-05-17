// @ts-nocheck
import { BaseTool } from './baseToolClass';
// import Search from './googleSearch';
import Browser from './webPageScraper';
// import { CreateAgent } from './createAgentClass';
// import { MessageAgent } from './messageAgentClass';
// import { ListAgents } from './listAgentsClass';
// import { DeleteAgent } from './deleteAgentClass';
// import * as FileSystemTools from './fileSystemToolsModule';
// import { ReviewCode } from './reviewCodeClass';
// import { ImproveCode } from './improveCodeClass';
// import { WriteTests } from './writeTestsClass';
// import { ExecutePythonFile } from './executePythonFileClass';
// import { EvaluateMath } from './evaluateMathClass';
// import { AskUser } from './askUserClass';
// import { Shell } from './shellClass';

/**
 * Creates a tool instance from the given configuration.
 * @param {Object} config - The tool configuration.
 * @returns {BaseTool} The tool instance.
 */
export function fromConfig(config) {
  const className = config["class"];
  const cls = userTools.get(className) || globals()[className];
  return cls.fromConfig(config);
}

/**
 * Returns an array of built-in tools.
 * @returns {Array<BaseTool>} The built-in tools.
 */
export function builtinTools() {
  return [
    // Search,
    Browser,
    // CreateAgent,
    // MessageAgent,
    // ListAgents,
    // DeleteAgent,
    // ...FileSystemTools,
    // ReviewCode,
    // ImproveCode,
    // WriteTests,
    // ExecutePythonFile,
    // EvaluateMath,
    // AskUser,
    // Shell,
  ];
}
