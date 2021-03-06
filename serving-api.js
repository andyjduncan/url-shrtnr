'use strict';

const AWS = require('aws-sdk/index');

const handlebars = require('handlebars');

const urlTemplate = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
    <title>to-link a page</title>

    <!-- Bootstrap -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css"
          integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">
</head>
<body>
<div class="container">
    <div class="row">
        <h1 class="site-title">to-link</h1>
    </div>
        <div class="row">
            to link <a id="original" href="{{url}}">{{url}}</a>
        </div>
        <div class="row">
            use <a id="short" href="{{shortenedRoot}}{{shortId}}">{{shortenedRoot}}{{shortId}}</a>
        </div>
        {{#if pageViews}}
        <div class="row">
            viewed {{pageViews}} times
        </div>
        {{/if}}
    </div>
</div>
</body>
</html>`;

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


    const handlebarsContext = {
        shortId,
        shortenedRoot,
        url: shortenedUrl.Item.url
    };

    if (shortenedUrl.Item.pageViews) {
        handlebarsContext.pageViews = shortenedUrl.Item.pageViews;
    }

    const body = template(handlebarsContext);

    const maxAge = process.env.MAX_AGE;

    return {
        statusCode: 200,
        headers: {
            'cache-control': `public, max-age=${maxAge}`,
            'content-type': 'text/html'
        },
        body
    }
};

module.exports = {serveUrl};