# Doraemon for Wire™

This is a chat bot for [Wire™](https://wire.com) chat app, developed in Node.JS on top of [Wire Bot Node SDK](https://github.com/wireapp/bot-sdk-node)

## Main Feature
- Use as gitlab push webhooks, i.e. send you a chat message when somebody pushed to your repo

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
1. URL where you are running the bot, https://$host:$port/bots/$botID/gitlab
2. Secret token


Start a chat with the bot, and text "help" to get a list of commands

Below will get you the $port and $botID needed to construct the URL
```
get gitlab hook
```

To get the secret token, just type
```
get gitlab token
```




