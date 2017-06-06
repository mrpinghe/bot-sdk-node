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
		"handle": "@username",
		"app_token": "PUSHOVER_APP_TOKEN",
		"user_token": "PUSHOVER_USER_TOKEN",
		"nick": "NICKNAME_FOR_THIS_USER"
	},
	{
		"handle": "@username2",
		"app_token": "PUSHOVER_APP_TOKEN",
		"user_token": "PUSHOVER_USER2_TOKEN",
		"nick": "NICKNAME_FOR_THIS_USER"
	},
]
```

and now whenever somebody does "@username" in that chat, a pushover notification would be sent to him/her




