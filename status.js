'use strict';

const DEFAULT_NOTIFICATION_STATUSES = Object.freeze(['idle', 'done', 'blocked']);

function getNotificationStatuses(config) {
    const statuses = config.notification_statuses;
    if (statuses === undefined) return DEFAULT_NOTIFICATION_STATUSES;
    if (!Array.isArray(statuses) || !statuses.every(status => typeof status === 'string')) {
        throw new Error('notification_statuses must be an array of strings');
    }
    return statuses;
}

function shouldPublishNotification(previousStatus, status, notificationStatuses = DEFAULT_NOTIFICATION_STATUSES) {
    if (!notificationStatuses.includes(status)) return false;
    if (status === 'idle') return previousStatus === 'working';
    return previousStatus !== status;
}

module.exports = { DEFAULT_NOTIFICATION_STATUSES, getNotificationStatuses, shouldPublishNotification };
