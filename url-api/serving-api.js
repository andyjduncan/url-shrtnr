'use strict';

const AWS = require('aws-sdk');

const handlebars = require('handlebars');

const urlTemplate = `<html>
<body>
<div>
Shortened Link <a href="{{shortenedRoot}}{{shortId}}">{{shortenedRoot}}{{shortId}}</a>
</div>
<div>
Links to <a href="{{url}}">{{url}}</a>
</div>
</body>`;

const serveUrl = async (httpInput) => {
    const dynamo = new AWS.DynamoDB.DocumentClient();

    const TableName = process.env.TABLE_NAME;

    const shortId = httpInput.pathParameters.shortId;
    const params = {
        TableName,
        Key: {shortId}
    };

    const shortenedUrl = await dynamo.get(params).promise();

    const template = handlebars.compile(urlTemplate);

    const shortenedRoot = process.env.SHORTENED_ROOT;

    const body = template({
        shortId,
        shortenedRoot,
        url: shortenedUrl.Item.url
    });

    return {
        statusCode: 200,
        headers: {
            'content-type': 'text/html'
        },
        body
    }
};

module.exports = {serveUrl};