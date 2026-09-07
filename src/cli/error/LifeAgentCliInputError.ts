export class LifeAgentCliInputError extends Error {
  public constructor() {
    super('Life Agent requires a non-blank request.')
    this.name = 'LifeAgentCliInputError'
  }
}
