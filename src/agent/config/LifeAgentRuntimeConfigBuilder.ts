import type { StrandsAgentRuntimeConfig } from '@tjxjnoobie/custom-strands-bridge'

import { LIFE_AGENT_SYSTEM_PROMPT } from '../prompt/LifeAgentSystemPrompt.js'

export type LifeAgentEnvironment = Readonly<Record<string, string | undefined>>

export class LifeAgentRuntimeConfigBuilder {
  private readonly environment: LifeAgentEnvironment

  public constructor(environment: LifeAgentEnvironment = process.env) {
    this.environment = environment
  }

  public build(): StrandsAgentRuntimeConfig {
    const modelId = this.optionalString(this.environment['LIFE_AGENT_MODEL_ID'])
    const mcpUrl = this.optionalString(this.environment['LIFE_AGENT_MCP_URL'])

    const authorization = this.optionalString(
      this.environment['LIFE_AGENT_MCP_AUTHORIZATION'],
    )

    const runtimeConfig: StrandsAgentRuntimeConfig = {
      agent: {
        id: 'life-agent',
        name: 'Life Agent',
        systemPrompt: LIFE_AGENT_SYSTEM_PROMPT,
        printer: false,
        traceAttributes: {
          product: 'life-agent',
          hackathonTrack: 'Everyday',
        },
        ...(modelId === undefined ? {} : { model: modelId }),
      },
      ...(mcpUrl === undefined
        ? {}
        : {
            mcpServers: {
              product: {
                url: mcpUrl,
                ...(authorization === undefined
                  ? {}
                  : { headers: { Authorization: authorization } }),
              },
            },
            mcpDefaults: {
              applicationName: 'life-agent',
              applicationVersion: '0.1.0',
            },
          }),
    }

    return runtimeConfig
  }

  private optionalString(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined
    }

    const normalizedValue = value.trim()

    return normalizedValue.length === 0 ? undefined : normalizedValue
  }
}
