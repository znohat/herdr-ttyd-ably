# herdr-ttyd-ably

Publish Herdr agent status notifications to Ably. This plugin is designed to
work with [znohat's custom ttyd build](https://github.com/znohat/ttyd), whose
browser integration subscribes to the channel and displays desktop
notifications.

## Install

```sh
herdr plugin install znohat/herdr-ttyd-ably
```

The plugin runs with Node.js and uses only Node's built-in modules. Its event
hook watches `pane.agent_status_changed` and publishes when a pane enters a
status selected by `notification_statuses`. Per-pane status is stored in
Herdr's plugin state directory so repeated status or presentation updates
don't send duplicate messages.

## Configure

[Ably](https://ably.com/) is a hosted realtime messaging service. The plugin publishes status
messages to an Ably channel, and the custom ttyd browser integration subscribes
to that channel to receive them. Create two API keys in the same Ably app,
restricted to the same channel, `YOUR_NOTIFICATION_CHANNEL`. Ably creates the
channel on demand when ttyd subscribes, so you don't need to create it in
advance.

- A publisher key with `publish` permission only.
- A browser key with `subscribe` permission only.

Keep the publisher key in the Herdr plugin config directory. ttyd sends the
browser key to clients through its notification configuration endpoint, where
it is visible to users who can access the page. Never use the publisher key or
a wildcard-capability key in the browser. Basic Auth limits page access but
does not conceal the key from authenticated users.

Configure the plugin:

```sh
herdr plugin enable herdr-ttyd-ably
PLUGIN_CONFIG_DIR="$(herdr plugin config-dir herdr-ttyd-ably)"
cat > "$PLUGIN_CONFIG_DIR/config.json" <<'EOF'
{
  "ably_api_key": "APP_ID.KEY_ID:PUBLISH_ONLY_SECRET",
  "channel": "YOUR_NOTIFICATION_CHANNEL",
  "notification_statuses": ["idle", "done", "blocked"]
}
EOF
chmod 600 "$PLUGIN_CONFIG_DIR/config.json"
```

The plugin reads `ably_api_key`, `channel`, and `notification_statuses` from
this file. It publishes `herdr.agent.done` messages with pane and workspace
details when a pane enters a selected status.

`notification_statuses` defaults to `["idle", "done", "blocked"]` and accepts
any exact status string. Repeated reports are suppressed; `idle` notifies only
after a `working` → `idle` transition. Set the array to `[]` to disable
notifications.
