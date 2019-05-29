'use strict';

const AWS = require('aws-sdk/index');

const querystring = require('querystring');

const handlebars = require('handlebars/lib/handlebars');

const waitFor = require('p-wait-for');

const linkingFormTemplate = `<!doctype html>
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
        <form action="/shorten" method="post" id="shortenForm">
            <div class="form-group">
                <label for="url">Page to link</label>
                <input type="url" name="url" class="form-control" placeholder="http://www.example.com"
                       pattern="https?://.+" required/>
            </div>
            <input type="submit" class="btn btn-default" value="Shorten"/>
        </form>
    </div>
</div>
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

const shortenUrl = async (httpInput) => {
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

    return {
        statusCode: 303,
        headers:{
            location: `/${shortId}`
        }
    };
};

module.exports = {shorteningForm, shortenUrl};