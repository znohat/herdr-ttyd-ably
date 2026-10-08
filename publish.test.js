'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { DEFAULT_NOTIFICATION_STATUSES, getNotificationStatuses, shouldPublishNotification } = require('./status');

test('defaults the notification status whitelist to idle, done, and blocked', () => {
    assert.deepEqual(getNotificationStatuses({}), ['idle', 'done', 'blocked']);
    assert.deepEqual(DEFAULT_NOTIFICATION_STATUSES, ['idle', 'done', 'blocked']);
});

test('accepts custom future statuses without checking Herdr status names', () => {
    const statuses = getNotificationStatuses({ notification_statuses: ['review', 'waiting_for_tool'] });

    assert.deepEqual(statuses, ['review', 'waiting_for_tool']);
    assert.equal(shouldPublishNotification('working', 'review', statuses), true);
});

test('filters status transitions through the configured whitelist', () => {
    assert.equal(shouldPublishNotification('working', 'done', ['idle']), false);
    assert.equal(shouldPublishNotification('working', 'idle', ['idle']), true);
});

test('does not publish repeated custom status values', () => {
    assert.equal(shouldPublishNotification('review', 'review', ['review']), false);
});

test('publishes a completion when a working pane becomes idle', () => {
    assert.equal(shouldPublishNotification('working', 'idle'), true);
});

test('does not publish when a pane first appears idle', () => {
    assert.equal(shouldPublishNotification(undefined, 'idle'), false);
});

test('does not publish repeated idle states', () => {
    assert.equal(shouldPublishNotification('idle', 'idle'), false);
});

test('publishes a new done transition', () => {
    assert.equal(shouldPublishNotification('working', 'done'), true);
});

test('does not publish repeated done states', () => {
    assert.equal(shouldPublishNotification('done', 'done'), false);
});

test('publishes when an agent becomes blocked', () => {
    assert.equal(shouldPublishNotification('working', 'blocked'), true);
});

test('does not publish repeated blocked states', () => {
    assert.equal(shouldPublishNotification('blocked', 'blocked'), false);
});
