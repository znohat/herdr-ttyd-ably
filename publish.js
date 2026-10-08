#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const { getNotificationStatuses, shouldPublishNotification } = require('./status');
const { createMessage } = require('./message');

function fail(message) {
    console.error(`ttyd Ably notifications: ${message}`);
    process.exitCode = 1;
}

function readConfig() {
    const configDirectory = process.env.HERDR_PLUGIN_CONFIG_DIR;
    if (!configDirectory) {
        throw new Error('HERDR_PLUGIN_CONFIG_DIR is not set');
    }

    const configPath = path.join(configDirectory, 'config.json');
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        throw new Error(`could not read ${configPath}: ${error.message}`);
    }

    if (typeof config.ably_api_key !== 'string' || !config.ably_api_key.trim()) {
        throw new Error(`set a publish-only Ably key in ${configPath} as ably_api_key`);
    }
    if (typeof config.channel !== 'string' || !config.channel.trim()) {
        throw new Error(`set the Ably channel in ${configPath} as channel`);
    }
    config.notification_statuses = getNotificationStatuses(config);

    return config;
}

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function recordStatusTransition(paneId, status, notificationStatuses) {
    const stateDirectory = process.env.HERDR_PLUGIN_STATE_DIR;
    if (!stateDirectory) {
        throw new Error('HERDR_PLUGIN_STATE_DIR is not set');
    }
    fs.mkdirSync(stateDirectory, { recursive: true });

    const statePath = path.join(stateDirectory, 'pane-status.json');
    const lockPath = `${statePath}.lock`;
    let lockFd;
    for (let attempt = 0; attempt < 1200; attempt += 1) {
        try {
            lockFd = fs.openSync(lockPath, 'wx', 0o600);
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;

            try {
                if (Date.now() - fs.statSync(lockPath).mtimeMs > 30000) {
                    fs.unlinkSync(lockPath);
                    continue;
                }
            } catch (statError) {
                if (statError.code !== 'ENOENT') throw statError;
            }
            await wait(25);
        }
    }
    if (lockFd === undefined) {
        throw new Error('timed out waiting for the plugin status lock');
    }

    try {
        let statuses = {};
        try {
            statuses = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        } catch (error) {
            if (error.code !== 'ENOENT') throw new Error(`could not read ${statePath}: ${error.message}`);
        }
        if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) {
            throw new Error(`${statePath} must contain a JSON object`);
        }

        const previousStatus = statuses[paneId];
        statuses[paneId] = status;
        const temporaryPath = `${statePath}.${process.pid}.tmp`;
        fs.writeFileSync(temporaryPath, JSON.stringify(statuses), { mode: 0o600 });
        fs.renameSync(temporaryPath, statePath);
        return shouldPublishNotification(previousStatus, status, notificationStatuses);
    } finally {
        fs.closeSync(lockFd);
        try {
            fs.unlinkSync(lockPath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}

function publish(config, event) {
    const data = event.data;
    const message = createMessage(event);
    const body = Buffer.from(JSON.stringify(message));
    const authorization = Buffer.from(config.ably_api_key).toString('base64');
    const request = https.request(
        {
            hostname: 'rest.ably.io',
            path: `/channels/${encodeURIComponent(config.channel)}/messages`,
            method: 'POST',
            headers: {
                Authorization: `Basic ${authorization}`,
                'Content-Type': 'application/json',
                'Content-Length': body.length,
            },
        },
        response => {
            let responseBody = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
                if (responseBody.length < 1024) {
                    responseBody += chunk;
                }
            });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    fail(`Ably publish failed with HTTP ${response.statusCode}: ${responseBody.trim()}`);
                    return;
                }
                console.log(`Published agent notification for pane ${data.pane_id} (${data.agent_status})`);
            });
        }
    );
    request.on('error', error => fail(`Ably publish request failed: ${error.message}`));
    request.end(body);
}

async function main() {
    const eventJson = process.env.HERDR_PLUGIN_EVENT_JSON;
    if (!eventJson) {
        throw new Error('HERDR_PLUGIN_EVENT_JSON is not set');
    }

    const event = JSON.parse(eventJson);
    if (
        event.event !== 'pane_agent_status_changed' ||
        !event.data ||
        event.data.type !== 'pane_agent_status_changed' ||
        typeof event.data.pane_id !== 'string' ||
        typeof event.data.agent_status !== 'string'
    ) {
        return;
    }

    const config = readConfig();
    if (
        !(await recordStatusTransition(event.data.pane_id, event.data.agent_status, config.notification_statuses))
    ) {
        console.log(
            `Skipped notification for pane ${event.data.pane_id}: no completion transition at ${event.data.agent_status}`
        );
        return;
    }
    publish(config, event);
}

main().catch(error => fail(error.message));
