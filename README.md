# herdr-ttyd-ably

Publish Herdr agent status notifications to Ably. The matching ttyd browser
integration subscribes to the channel and displays desktop notifications.

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

Create two API keys in the same Ably app, restricted to the exact same channel
(the default example is `herdr-agent-completed`):

- A publisher key with `publish` permission only.
- A browser key with `subscribe` permission only.

Keep the publisher key in the Herdr plugin config directory. The browser key
is compiled into the ttyd frontend and is visible to anyone who can load that
page; never use the publisher key or a wildcard-capability key in the browser.
Basic Auth limits page access but does not conceal browser code from
authenticated users.

Configure the plugin:

```sh
herdr plugin enable ttyd.ably-notifications
PLUGIN_CONFIG_DIR="$(herdr plugin config-dir ttyd.ably-notifications)"
cat > "$PLUGIN_CONFIG_DIR/config.json" <<'EOF'
{
  "ably_api_key": "APP_ID.KEY_ID:PUBLISH_ONLY_SECRET",
  "channel": "herdr-agent-completed",
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
