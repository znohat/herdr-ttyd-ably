'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createMessage } = require('./message');

test('publishes idle status so the browser can explain it is waiting for input', () => {
    const message = createMessage({
        data: {
            agent_status: 'idle',
            pane_id: 'w3:p2',
            workspace_id: 'w3',
            display_agent: 'codex',
        },
    });

    assert.equal(message.name, 'herdr.agent.done');
    assert.equal(message.data.status, 'idle');
    assert.equal(message.data.agent, 'codex');
});

test('uses Herdr’s canonical agent name before a display label override', () => {
    const message = createMessage({
        data: {
            agent_status: 'done',
            pane_id: 'w3:p2',
            agent: 'claude',
            display_agent: 'Codex',
        },
    });

    assert.equal(message.data.agent, 'claude');
});

test('publishes done status so the browser can explain the work finished', () => {
    const message = createMessage({ data: { agent_status: 'done', pane_id: 'w3:p2' } });

    assert.equal(message.data.status, 'done');
});

test('publishes blocked status so the browser can explain the agent needs input', () => {
    const message = createMessage({ data: { agent_status: 'blocked', pane_id: 'w3:p2' } });

    assert.equal(message.data.status, 'blocked');
});
