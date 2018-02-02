# Doraemon for Wire™

This is a chat bot for [Wire™](https://wire.com) chat app, developed in Node.JS on top of [Wire Bot Node SDK](https://github.com/wireapp/bot-sdk-node)

## Main Feature
- Use as gitlab push webhooks, i.e. send you a chat message when somebody pushed to your repo
- Get [Pushover](https://pushover.net/) to notify you when somebody "@ you" in the channel (beta)

## BYO Bot
This contains the SDK files as well, and please refer to the [Wire Bot Node SDK](https://github.com/wireapp/bot-sdk-node) page for installation as well as cert generation instructions.

Add a doraemon/configs/config.js file (.gitignored in this repo) that looks like this

```
const path = require('path');

module.exports = {
  getBotOptions() {
    return {
      port: 8050,
      key: path.join(__dirname, 'server.key'),
      cert: path.join(__dirname, 'server.crt'),
      storePath: path.join(__dirname, 'store'),
      auth: 'YOUR_AUTH_TOKEN_FROM_DEVBOT',
    }
  },
};
```

Then you can start the bot
```
node doraemon/bot.js
```

## Hook Setup
The specific setup instruction is available on [gitlab's official site](https://docs.gitlab.com/ce/user/project/integrations/webhooks.html)

To set up a webhook, you need two pieces of information
1. Webhook URL
2. Secret token


Start a chat with the bot, and text "help" to get a list of commands

Below will get you the URL
```
get gitlab hook
```

To get the secret token, just type
```
get gitlab token
```

## Pushover notification
Create a file called pushover.json under your $storePath/$botID for whichever chat/bot instance you want this feature to be enabled

Format
```
[
	{
		"handle": ["@username", "@username_alt"],
		"app_token": "PUSHOVER_APP_TOKEN",
		"user_token": "PUSHOVER_USER_TOKEN",
		"nick": "NICKNAME_FOR_THIS_USER"
	},
	{
		"handle": ["@username2"],
		"app_token": "PUSHOVER_APP_TOKEN",
		"user_token": "PUSHOVER_USER2_TOKEN",
		"nick": "NICKNAME_FOR_THIS_USER"
	},
]
```

and now whenever somebody does "@username" or "@username_alt" in that chat, a pushover notification would be sent to him/her.

If somebody does "@all", "@here", or "@everyone", pushover notification would be sent to everyone configured in the pushover.json

## JIRA integration

Type "jira help" to get started
```
jira help

+ set jira <api URL> # e.g. jira.example.com, jira.example.com:8443/rest/api/latest
    1. only support https, port default 443, api root path default /rest/api/latest
+ set jira auth <basic_auth_token> # e.g. dXNlcm5hbWU6cGFzc3dvcmQ=
+ set jira alias <alias>=<key> # set up to 10 jira command aliases
    1. set jira alias note=PROJ would allow you to do "note: <value>" in the future 
        to create an issue under project PROJ with description = value
    2. set jira alias note=PROJ-10 would allow you to do "note: <value>" in the future 
        to append <value> to the issue PROJ-10
+ jira config # show current configs and aliases. SHA256 value of auth token is shown
+ jira alias # show current aliases.
```

1. Configure your JIRA URL (only https)
```
set jira jira.example.com:1337/rest/api/v2
``` 

2. Configure your JIRA auth (only http basic auth at the moment, i.e. base64 encoded string of $username:$password)
```
set jira auth dXNlcm5hbWU6cGFzc3dvcmQ=
```

3. Configure aliases
Use an alias to point to either a project key (PROJ) that represents your project or an issue key (PROJ-11) that represents an issue

If you have an alias for a project key, say 
```
set jira alias todo=PROJ
```

Once the alias is set, you can do
```
todo: I need to do this thing around this time so people don't get mad
```

Then a new issue is created under PROJ, with the first 60 characters (or the entire message, whichever is shorter) as the summary, the entire message as description. Then the bot will return the link to the new issue for you to click and go to, if you want to edit some other attributes.

If you have an alias for an issue key, say
```
set jira alias todo=PROJ-1
```

Then if you use the alias again, PROJ-1's description will get appended with the rest of the message

Note:
- All issue creation and update will appear to be done by the user represented by the basic auth token you configured
- The user who actually added that will have his/her name as seen by Wire prepended to the message he/her added, e.g.
```
Chris added:

I need to do this thing around this time so people don't get mad

Jose added:

Remind Chris to do this thing around that time so I don't get mad
```
- Each user in the group can start a separate chat with the bot and do their own configuration once, so their own cred will be used, and the issue reporter and updater will be added correctly