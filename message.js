'use strict';

function createMessage(event) {
    const data = event.data;
    return {
        name: 'herdr.agent.done',
        data: {
            status: data.agent_status,
            pane_id: data.pane_id,
            workspace_id: data.workspace_id,
            agent: data.agent || data.display_agent || null,
            title: data.title || null,
        },
    };
}

module.exports = { createMessage };
