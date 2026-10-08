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

## Configure Ably

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
this file. It publishes messages named `herdr.agent.done` with the pane ID,
workspace ID, agent label, pane title, and triggering status.

`notification_statuses` is an optional whitelist of status strings that should
emit notifications. It defaults to `["idle", "done", "blocked"]`. You can
list any status string, including statuses Herdr may add in the future.
Statuses are matched exactly; the plugin does not validate them against a
fixed list. A status is notified when the pane enters it, and repeated reports
of the same status are suppressed. `idle` keeps its existing behavior and
notifies only after a `working` → `idle` transition. Set the array to `[]` to
disable all notifications. The ttyd frontend currently has custom notification
text for `idle`, `done`, and `blocked`; other statuses use a generic status
change description.

## ttyd browser setup

The browser integration must be included in a ttyd frontend build. Build the
ttyd checkout containing the notification UI with the subscribe-only key and
the matching channel:

```sh
cd ~/ttyd/html
cp .env.example .env # do this once
# Edit .env and set ABLY_SUBSCRIBE_KEY to the subscribe-only key.
corepack yarn build
```

Then rebuild and restart ttyd so it serves the generated frontend. In the
browser, interact with the page to request notification permission. Use HTTPS
or localhost; browsers may block notification permission on an insecure origin.

The ttyd frontend changes are maintained in the ttyd source checkout; installing
this Herdr plugin alone does not patch or rebuild ttyd.

## Troubleshooting

- No control in ttyd: the frontend build needs `ABLY_SUBSCRIBE_KEY` set.
- Ably connection failure: check that the browser key has subscribe access to
  the exact channel and that the browser can reach Ably.
- No notifications: check that the plugin is enabled, the publisher key has
  publish access to the same channel, and Herdr transitions into a status in
  `notification_statuses`.
- HTTP publish errors appear in the Herdr plugin command log. The plugin does
  not print the key.
