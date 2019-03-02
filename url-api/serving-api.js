'use strict';

const AWS = require('aws-sdk');

const handlebars = require('handlebars');

const urlTemplate = `<html>
<body>
<a href="{{url}}">{{url}}</a>
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

    const body = template({
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