import type { IStrandsAgentRuntimeBootstrap } from '@tjxjnoobie/custom-strands-bridge'

import type { LifeAgentRuntimeConfigBuilder } from '../agent/config/LifeAgentRuntimeConfigBuilder.js'
import { LifeAgentCliInputError } from './error/LifeAgentCliInputError.js'

export class LifeAgentCliHandler {
  private readonly agentRuntimeBootstrap: IStrandsAgentRuntimeBootstrap
  private readonly runtimeConfigBuilder: LifeAgentRuntimeConfigBuilder

  public constructor(
    agentRuntimeBootstrap: IStrandsAgentRuntimeBootstrap,
    runtimeConfigBuilder: LifeAgentRuntimeConfigBuilder,
  ) {
    this.agentRuntimeBootstrap = agentRuntimeBootstrap
    this.runtimeConfigBuilder = runtimeConfigBuilder
  }

  public async handle(request: string): Promise<string> {
    const normalizedRequest = request.trim()

    if (normalizedRequest.length === 0) {
      throw new LifeAgentCliInputError()
    }

    const agentRuntime = await this.agentRuntimeBootstrap.createAgentRuntime(
      this.runtimeConfigBuilder.build(),
    )

    try {
      const result = await agentRuntime.invokeAgent(normalizedRequest)

      return result.toString()
    } finally {
      await agentRuntime.close()
    }
  }
}
