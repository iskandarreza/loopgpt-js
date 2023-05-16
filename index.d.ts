declare module "loopgpt-js" {
  interface Agent {
    // Define the interface for your Agent class here
  }
  
  enum AgentStates {
    // Define the enum values for AgentStates here
  }
  
  interface LocalMemory {
    // Define the interface for your LocalMemory class here
  }
  
  interface OpenAIEmbeddingProvider {
    // Define the interface for your OpenAIEmbeddingProvider class here
  }
  
  interface OpenAIModel {
    // Define the interface for your OpenAIModel class here
  }
  
  export {
    Agent, 
    AgentStates, 
    LocalMemory, 
    OpenAIEmbeddingProvider, 
    OpenAIModel
  };
}
