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

const fs = require('fs');
const crypto = require('crypto');
const EventEmitter = require('events').EventEmitter;
const uuidV1 = require('uuid/v1');
const url = require('url');


module.exports = class BotInstance extends EventEmitter {
  constructor(botID, service) {
    super();
    this.botID = botID;
    this.service = service;
  }

  onMessage(from, message) {
    this.emit('message', from, message);
  }

  onImage(from, asset) {
    this.emit('image', from, asset);
  }

  onConversationMemberJoin(members, conversation) {
    this.emit('join', members, conversation);
  }

  onConversationMemberLeave(members, conversation) {
    this.emit('leave', members, conversation);
  }

  onConversationRename(name, conversation) {
    this.emit('rename', name, conversation);
  }

  onGitlabPush(data) {
    this.emit('gitlabPush', data);
  }

  sendApiCall(method, path, data, additionalHeaders, cb) {
    this.service.bots[this.botID].httpsClient.sendRequest(method, path, data, additionalHeaders, cb);
  }

  requestForJSON(options, data, cb) {
    this.service.bots[this.botID].httpsClient.requestForJSON(options, data, cb);
  }

  sendMessage(message, cb) {
    const msg = {
      message_id: uuidV1(),
      text: {
        content: message,
        mention: [],
        link_preview: [],
      },
    };
    this.service.sendMessage(this.botID, msg, cb);
  }

  sendImage(data, mimeType, meta, cb) {
    BotInstance.encrypt(data, (encData, otrKey, iv, sha256) => {
      console.log(`len of enc data ${encData.length}`);
      const j = {
        public: false,
        retention: 'volatile',
      };
      const js = JSON.stringify(j);

      const hash = crypto.createHash('md5');
      hash.update(encData);
      const h = hash.digest('base64');

      let d = '--frontier\r\n';
      d += 'Content-Type: application/json; charset=utf-8\r\n';
      d += `Content-Length: ${js.length}\r\n\r\n`;
      d += `${js}\r\n`;

      d += '--frontier\r\n';
      d += `Content-Type: ${mimeType}\r\n`;
      d += `Content-Length: ${encData.length}\r\n`;
      d += `Content-MD5: ${h}\r\n\r\n`;

      const final = Buffer.concat([Buffer.from(d), encData, Buffer.from('\r\n--frontier--\r\n')]);

      this.service.uploadAsset(this.botID, final, (rd, re) => {
        console.log(`upload completed2 ${rd} ${re}`);
        if (re >= 200 && re < 300) {
          // upload successful
          const json = JSON.parse(rd.toString('utf8')); // fixme: try/catch
          this.service.sendMessage(this.botID, {
            message_id: uuidV1(),
            asset: {
              original: {
                mime_type: mimeType,
                size: data.length,
                image: {
                  width: meta.width,
                  height: meta.height,
                },
              },
              uploaded: {
                otr_key: otrKey,
                sha256,
                asset_id: json.key,
                asset_token: json.token,
              },
            },
          }, cb);
        }
      });
    });
  }

  getAsset(assetID, assetToken, decryptKey, sha256, cb) {
    this.service.getAsset(this.botID, assetID, assetToken, decryptKey, sha256, cb);
  }

  getGitlabToken(isReset) {
    var secretFile = this.service.storePath + "/" + this.botID + "/gitlab.secret";

    var token = "";
    if (!fs.existsSync(secretFile) || isReset) {
      var hash = crypto.createHash('sha256');
      hash.update(uuidV1());
      token = hash.digest('hex');
      fs.writeFileSync(secretFile, token);
      console.log(`set new token ${token}`);
    }
    else {
      token = fs.readFileSync(secretFile).toString(); 
      console.log(`found token ${token}`);
    }

    return token;
  }

  /*
    - Configure JIRA API, stored as a JSON file on disk
    - apiUrl is where the JIRA instance is hosted
    - token is the base64 of username:password, used for basic auth. TODO: do OAuth token
    - newAlias is {"alias": "JIRA project or issue key"}  object to store/update as an alias
  */
  configJira(apiUrl, token, newAlias, deletedAliases) {
    // get jira config object in JSON with raw cred (because we need to write the object to disk in the end)
    var jiraJson = this.jiraConfig(true, true);

    if (apiUrl) {
      // url parse can't handle ones without protocol, and we don't want to ask user to write protocol
      if (!apiUrl.toLowerCase().startsWith("https://") && !apiUrl.toLowerCase().startsWith("http://")) {
        apiUrl = `https://${apiUrl}`;
      }

      apiUrl = url.parse(apiUrl);
      jiraJson.host = apiUrl.hostname;
      // always go back to default, rather than what's in there now. in case the infra changed completely
      jiraJson.port = apiUrl.port == undefined ? 443 : apiUrl.port;
      jiraJson.path = apiUrl.path == "/" ? "/rest/api/latest" : apiUrl.path;
    }

    if (token) {
      jiraJson.auth = token;
    }

    if (newAlias) {
      // already 10 or more, and the new one is not already there (otherwise, it's just updating)
      if (Object.keys(jiraJson.aliases).length >= 10 && jiraJson.aliases[Object.keys(newAlias)[0]] == null) {
        bot.emit("send", "Too many aliases (10 max)");
      }
      else {
        Object.assign(jiraJson.aliases, newAlias);
      }
    }

    if (deletedAliases && deletedAliases.length > 1) {
      for (let alias of deletedAliases) {
        delete jiraJson.aliases[alias];
      }
    }

    this.jiraConfig(null, null, jiraJson);
  }

  /*
    - Write the jira configuration file (JSON obj) if configObj != null, and send the content to the user as message
    - Otherwise, read the jira configuration file stored on disk, and return the string representation of the JSON obj
    - If returnJson is true, then return the JSON obj
    - The auth token will be hashed with SHA256 before being returned,
      unless the caller wants the raw value, indicated by haivng rawAuth = true
  */
  jiraConfig(returnJson, rawAuth, configObj) {
    var bot = this;
    var jiraFile = bot.service.storePath + "/" + bot.botID + "/jira.json";

    // this is to indicate we want to write the obj to disk
    if (configObj) {
      fs.writeFile(jiraFile, JSON.stringify(configObj), (err) => {
        if (err) {
          console.log(`saving file failed ${err}`);
          bot.emit("send", "error saving config file");
        }

        if (configObj.auth != undefined && !rawAuth) {
          var hash = crypto.createHash('sha256');
          hash.update(configObj.auth);
          configObj.auth = "SHA256 of basic auth token: " + hash.digest('hex');
        }

        // update alias cache
        bot.aliases = configObj.aliases;
        bot.emit("send", JSON.stringify(configObj));
      });
      return;
    }

    try {
      var data = fs.readFileSync(jiraFile);
      configObj = JSON.parse(data.toString());
    } catch (e) {
      // trying to find config without setting (or just some file read problems)
      console.log(`read file error: ${e}`);
      configObj = {
        "host": null,
        "port": 443,
        "path": "/rest/api/latest",
        "auth": null,
        "aliases": {}
      };
    }

    if (configObj.auth != undefined && !rawAuth) {
      var hash = crypto.createHash('sha256');
      hash.update(configObj.auth);
      configObj.auth = "SHA256 of basic auth token: " + hash.digest('hex');
    }

    bot.aliases = configObj.aliases;

    if (returnJson) {
      return configObj;
    }
    else {
      return JSON.stringify(configObj);
    }
  }

  /*
    - calling JIRA API to perform actions
      1. create new issue under project
      2. update existing issue
  */
  jira(type, content, successCb) {
    var jiraInfo = this.jiraConfig(true, true);
    var bot = this;

    var options = {
        host: jiraInfo.host,
        port: jiraInfo.port,
        path: jiraInfo.path,
        headers: {
            "Authorization": `Basic ${jiraInfo.auth}`,
            "Content-Type": "application/json"
        },
        method: 'GET'
    };

    var postBody = {};

    switch (type) {
        case 'create':
            options.path += "/issue";
            options.method = 'POST';
            postBody = {
              "fields": {
                "project": {
                  "key": content.key
                },
                "summary": content.summary,
                "issuetype": {
                  "name": "Story"
                },
                "priority": {
                    "name": "Medium"
                },
                "description": `${content.reporter} added:\n\n${content.desc}`
              }
            };
            break;
        case 'update':
            options.path += `/issue/${content.key}`;
            options.method = 'PUT';
            postBody = {
              "fields": {
                "description": `${content.origDesc}\n\n${content.reporter} added:\n\n${content.desc}`
              }
            };
            break;
        case 'get':
            options.path += `/issue/${content.key}`;
            break;
        default:
            console.log(`unknown jira event type ${type}`);
            break;
    }

    // make the final jira API call
    this.requestForJSON(options, JSON.stringify(postBody), (status, obj) => {
        console.log(`${type} ${content.key} returned status ${status}`);
        switch (status) {
          case 1:
            if (obj.errorMessages != undefined) {
              bot.emit("send", obj.errorMessages);
            }
            else {
              console.log(`${type} event completed successfully`);
              if (successCb) {
                successCb(obj);
              }
              else {
                var key = obj.key == undefined ? content.key : obj.key;
                bot.emit("send", `https://${jiraInfo.host}:${jiraInfo.port}/browse/${key}`);
              }
            }
            break;
          default:
            console.log(obj);
            bot.emit("send", "Something went wrong :(");
            break;
        }

    });
  }

  pushover(results) {
    var isAll = false;
    var targetList = new Set();
    for (let target of results) {
      if (target == "@here" || target == "@everyone" || target == "@all") {
        isAll = true;
        break;
      }
      else {
        targetList.add(target.toLowerCase());
      }
    }

    var poFile = this.service.storePath + "/" + this.botID + "/pushover.json";

    var tokenInfo = JSON.parse(fs.readFileSync(poFile).toString());
    var options = {
        host: 'api.pushover.net',
        port: 443,
        path: '/1/messages.json',
        method: 'POST'
    };


    for (let user of tokenInfo) {
      for (let handle of user.handles) {
        if (isAll || targetList.delete(handle)) {
          if (user.app_token.length > 0 && user.user_token.length > 0) {

            var postBody = `token=${user.app_token}&user=${user.user_token}&message=Paging ${user.nick}`;

            this.requestForJSON(options, postBody, (status, obj) => {
              switch (status) {
                case 1:
                  if (obj.status != null && obj.status == 1) {
                    console.log(`pushover successful for ${handle}`);
                  }
                  else {
                    bot.emit("send", `Pushover notification may have failed for ${handle}`);
                  }
                  break;
                default:
                  console.log(obj);
                  bot.emit("send", `Pushover notification may have failed for ${handle}`);
                  break;
              };
            });
          }
          // no need to keep looping other handle for the same person, and avoid double alerting
          break;
        }
      }
    }
  }



  // generate random key (32 bytes) and random iv (16 bytes)
  static encrypt(data, cb) {
    crypto.randomBytes(32, (e1, key) => {
      if (e1) throw e1;
      crypto.randomBytes(16, (e2, iv) => {
        if (e2) throw e2;
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const final = Buffer.concat([iv, cipher.update(data), cipher.final()]);
        const hash = crypto.createHash('sha256');
        hash.update(final);
        const hb = hash.digest();
        cb(final, key, iv, hb);
      });
    });
  }
};
