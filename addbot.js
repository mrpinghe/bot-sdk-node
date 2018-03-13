const https = require("https");

const botName = "doraemon";
const serviceId = "";
const providerId = "";
const email = "";
const password = "";
/*
	1. log in => get authorization bearer
	2. use authorization bearer to get bot convo ID
	3. use service and provider IDs to join convo with bot
*/

var httpsOpts = {
	"host": "prod-nginz-https.wire.com",
	"port": 443,
	"path": "/login",
	"method": "POST",
	"headers": {
		"Content-Type": "application/json"
	}
};

var req = https.request(httpsOpts, (resp) => {
	var str = "";
	resp.on("data", (chunk) => {
		str += chunk;
	});

	resp.on("end", () => {
		console.log(`login response: ${str}`);
		try {
			var jsonObj = JSON.parse(str);
			var token = jsonObj["access_token"];
			getBotId(token);
		} catch(e) {
			console.log(`parsing error ${e}`);
		}
	});
});


req.write(`{"email": "${email}", "password": "${password}"}`);
req.end();

function getBotId(token) {
	var optsUpdate = {
		"path": "/conversations",
		"headers": {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json"
		}
	};

	Object.assign(httpsOpts, optsUpdate);

	var request = https.request(httpsOpts, (resp) => {
		var str = "";
		resp.on("data", (chunk) => {
			str += chunk
		});

		resp.on("end", () => {
			console.log(`get bot ID resp: ${str}`);
			try {
				var jsonObj = JSON.parse(str);
				var botId = jsonObj.id;
				startConvo(botId, token);
			} catch(e) {
				console.log(`parsing error ${e}`);
			}
		});
	});

	request.write(`{"users": [], "name": "${botName}"}`);
	request.end();
}

function startConvo(botId, token) {
	var optsUpdate = {
		"path": `/conversations/${botId}/bots`,
		"headers": {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json"
		}		
	};

	Object.assign(httpsOpts, optsUpdate);

	var request = https.request(httpsOpts, (resp) => {
		var str = "";
		resp.on("data", (chunk) => {
			str += chunk
		});

		resp.on("end", () => {
			console.log(`start convo resp: ${str}`);
		});
	});

	request.write(`{"service": "${serviceId}", "provider": "${providerId}"}`);
	request.end();
}