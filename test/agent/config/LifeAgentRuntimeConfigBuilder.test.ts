import assert from 'node:assert/strict'
import test from 'node:test'

import { LifeAgentRuntimeConfigBuilder } from '../../../src/agent/config/LifeAgentRuntimeConfigBuilder.js'
import { LIFE_AGENT_SYSTEM_PROMPT } from '../../../src/agent/prompt/LifeAgentSystemPrompt.js'

test('buildsStableProductIdentityAndPrompt', () => {
  const runtimeConfig = new LifeAgentRuntimeConfigBuilder({}).build()

  assert.equal(runtimeConfig.agent.id, 'life-agent')
  assert.equal(runtimeConfig.agent.name, 'Life Agent')
  assert.equal(runtimeConfig.agent.systemPrompt, LIFE_AGENT_SYSTEM_PROMPT)
  assert.equal(runtimeConfig.agent.printer, false)
  assert.equal(runtimeConfig.agent.model, undefined)
  assert.equal(runtimeConfig.mcpServers, undefined)
})

test('buildsConfiguredModelAndMcpBoundaryFromEnvironment', () => {
  const builder = new LifeAgentRuntimeConfigBuilder({
    LIFE_AGENT_MODEL_ID: ' model.example ',
    LIFE_AGENT_MCP_URL: ' https://example.invalid/mcp ',
    LIFE_AGENT_MCP_AUTHORIZATION: ' Bearer example ',
  })

  const runtimeConfig = builder.build()

  assert.equal(runtimeConfig.agent.model, 'model.example')
  assert.notEqual(typeof runtimeConfig.mcpServers, 'string')
  const mcpServers = typeof runtimeConfig.mcpServers === 'string'
    ? undefined
    : runtimeConfig.mcpServers
  assert.equal(mcpServers?.product?.url, 'https://example.invalid/mcp')
  assert.deepEqual(mcpServers?.product?.headers, {
    Authorization: 'Bearer example',
  })
  assert.equal(runtimeConfig.mcpDefaults?.applicationName, 'life-agent')
})

test('ignoresBlankOptionalEnvironmentValues', () => {
  const runtimeConfig = new LifeAgentRuntimeConfigBuilder({
    LIFE_AGENT_MODEL_ID: '   ',
    LIFE_AGENT_MCP_AUTHORIZATION: '   ',
  }).build()

  assert.equal(runtimeConfig.agent.model, undefined)
})
