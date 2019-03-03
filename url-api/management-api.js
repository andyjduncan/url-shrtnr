'use strict';

const AWS = require('aws-sdk');

const querystring = require('querystring');

const handlebars = require('handlebars');

const waitFor = require('p-wait-for');

const linkingFormTemplate = `<html xmlns="http://www.w3.org/1999/html">
<body>
<form action="/dev/shorten" method="post" id="shortenForm">
<label for="url">Enter a URL to shorten</label>
<input type="url" name="url" placeholder="http://www.example.com" pattern="https?://.+" required />
<input type="submit">Shorten</input>
</form>
</body>
</html>`;

const shorteningForm = async () => {
    const template = handlebars.compile(linkingFormTemplate);

    const body = template();

    return {
        statusCode: 200,
        headers: {
            'content-type': 'text/html'
        },
        body
    }
};

const shortenedUrlTemplate = `<html>
Short URL for {{url}}
<br />
<a href="{{shortUrl}}">{{shortUrl}}</a>
</html>`;

const shortenUrl = async (httpInput) => {
    console.log(JSON.stringify(httpInput));

    const stepFunctions = new AWS.StepFunctions();

    const stateMachineArn = process.env.SAVE_URL;

    const url = querystring.parse(httpInput.body).url;

    const input = JSON.stringify({url});

    const params = {
        stateMachineArn,
        input
    };

    const execution = await stepFunctions.startExecution(params).promise();

    let shortenResult = {};

    await waitFor(async () => {
        shortenResult = await stepFunctions.describeExecution({
            executionArn: execution.executionArn
        }).promise();

        return shortenResult.hasOwnProperty('output');
    });

    const shortId = JSON.parse(shortenResult.output).shortId;

    const shortenedRoot = process.env.SHORTENED_ROOT;

    const shortUrl = `${shortenedRoot}${shortId}`;

    const template = handlebars.compile(shortenedUrlTemplate);

    const body = template({url, shortUrl});

    return {
        statusCode: 200,
        headers:{
            'content-type': 'text/html'
        },
        body
    };
};

module.exports = {shorteningForm, shortenUrl};