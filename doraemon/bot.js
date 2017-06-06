/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

//const service = require('wire-bot-sdk-node');

const service = require('../lib/service');
const config = require('./configs/config')

var opts = config.getBotOptions();


service.createService(opts, (bot) => {
  console.log(`Bot instance created ${bot.botID}`);
  bot.on('message', (from, message) => {
    var msg = message.text.content;
    console.log(`Got message from ${from} text: ${msg}`);
    reply = "";

    if (msg.toLowerCase() == "help") {
      reply = "get gitlab hook - give you the port number and bot ID needed to configure webhook";
      reply += "\nget gitlab token - give you the secret token needed to configure webhook. Unique per chat.";
      reply += "\nreset gitlab token - reset the secret token needed to configure webhook. Old hooks will break!";
    }
    else if (msg.toLowerCase() == "get gitlab hook") {
      var exec = require('child_process').exec;
      var cmd = 'dig +short myip.opendns.com @resolver1.opendns.com';

      exec(cmd, function(error, stdout, stderr) {
        var ip = stdout.trim();
        reply = `https://${ip}:${opts.port}/bots/${bot.botID}/gitlab`;
      });
    }
    else if (msg.toLowerCase() == "get gitlab token") {
      reply = bot.getGitlabToken();
    }
    else if (msg.toLowerCase() == "reset gitlab token") {
      reply = bot.getGitlabToken(true);
    }

    if (reply != "") {
      bot.sendMessage(reply, (sendStatus) => {
        console.log(`message successfully sent with status ${sendStatus}`);
      });
    }

    var atNotation = /@[a-z0-9]*/ig;
    var results = msg.match(atNotation);

    if (results != null) {
      var isAll = false;
      var unique = new Set();
      for (let target of results) {
        if (target == "@here" || target == "@everyone" || target == "@all") {
          isAll = true;
          break;
        }
        else {
          unique.add(target.toLowerCase());
        }
      }
      bot.pushover(unique, isAll, function(user) {
        bot.sendMessage(`Pushover notification may have failed for ${user}`, (sendStatus) => {
          console.log(`message successfully sent with status ${sendStatus}`);
        });
      });
    }
  });
  bot.on('gitlabPush', (data) => {
    console.log("Got push event from gitlab")
    var msg = `${data['user_name']} pushed to project ${data.project.name} (url: ${data.project.homepage})`;
    bot.sendMessage(msg, (sendStatus) => {
      console.log(`message successfully sent with status ${sendStatus}`);
    });
  });
  bot.on('join', (members, conversation) => {
    console.log(`New members ${members} joined conversation ${conversation.id}`);
//    bot.sendMessage('welcome', (sendStatus) => {
//      console.log(`message successfully sent with status ${sendStatus}`);
//    });
  });
  bot.on('leave', (members, conversation) => {
    console.log(`Members ${members} have left conversation ${conversation.id}`);
  });
  bot.on('rename', (name, conversation) => {
    console.log(`Conversation ${conversation.id} renamed to ${name}`);
  });
  bot.on('image', (from, asset) => {
    console.log(`****** Got image from ${from}`);

    /*
    console.log(asset);

    { message_id: 'f277ba7b-0d3a-46b6-9cd6-16e08de5c1aa',
    asset: 
    {original: { mime_type: 'image/png', size: 355, name: '', image: [Object] },
     uploaded: 
      { otr_key: <Buffer 21 1b aa e0 7a b5 ed 0a 3d 89 27 73 e5 af 7e f5 56 0d 7c b3 9f c6 5b f7 a3 42 93 00 6d a3 e3 26>,
        sha256: <Buffer 4d 5b 51 5e 48 d6 ac d7 71 26 12 59 10 23 12 23 b6 99 ac 3b 38 30 9e 49 14 28 53 36 42 6e 2b c6>,
        asset_id: '3-2-cbcad9b9-19b4-406c-b560-aeb6de1418fe',
        asset_token: 'r5gfiW-wlLDXBed5_3M4kg==' },
     preview: null } }
     */
    /*
    bot.getAsset?
    bot.sendImage(asset.asset.original.image, asset.asset.original.mime_type, asset.asset.original.image, (sendStatus) => {
      console.log(`message successfully sent with status ${sendStatus}`);
    });
    */
  });
});
