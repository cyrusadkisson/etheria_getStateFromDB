const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

function isNumeric(str) {
	if (typeof str != "string")
		return false; // we only process strings!  
	return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
		!isNaN(parseFloat(str)); // ...and ensure strings of whitespace fail
}

exports.handler = async (event, context, callback) => {
	console.log("event=" + JSON.stringify(event));

	return new Promise((resolve, reject) => {

		if (!
			(
				event.params.querystring.version === "0.9" ||
				event.params.querystring.version === "1.0" ||
				event.params.querystring.version === "1.1" ||
				event.params.querystring.version === "1.2"
			)
		) {
			reject(new Error("Invalid or missing version parameter"));
			return;
		}
		console.log("version=" + event.params.querystring.version);

		if (event.params.querystring.atBlock === "latest")
			event.params.querystring.atBlock = "9000000000"; // nine billion

		if (!event.params.querystring.atBlock || !isNumeric(event.params.querystring.atBlock)) {
			reject(new Error("event.params.querystring.atBlock is invalid or missing"));
			return;
		}
		console.log("atBlock=" + JSON.stringify(event.params.querystring.atBlock));

		var exclusiveStartKey = {
			"version": event.params.querystring.version,
			"blockNumber": (event.params.querystring.atBlock * 1)+1
		};

		var params = {
			TableName: "EtheriaStates",
			KeyConditionExpression: "#vs = :vvv",
			ExpressionAttributeNames: { "#vs": "version" },
			ExpressionAttributeValues: {
				":vvv": event.params.querystring.version,
			},
			ScanIndexForward: false,
			// ProjectionExpression: projex,
			ExclusiveStartKey: exclusiveStartKey,
			Limit: 1
		};

		dynamoDB.query(params, function(err, data) {
			if (err) {
				console.log("Error", err);
				reject(err);
			}
			else {
				if (data.Items.length > 0)
					resolve(data.Items[0]);
				else
					resolve(); // found nothing, resolve with nothing
			}
		});
	});
};
