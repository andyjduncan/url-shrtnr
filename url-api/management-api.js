'use strict';

const AWS = require('aws-sdk');

const pWhilst = require('p-whilst');

const shortenUrl = async (httpInput) => {
    const stepFunctions = new AWS.StepFunctions();

    const stateMachineArn = process.env.SAVE_URL;

    const input = httpInput.body;

    const url = JSON.parse(httpInput.body).url;

    const name = `${url}-${new Date().getTime()}`;

    const params = {
        stateMachineArn,
        input,
        name
    };

    const execution = await stepFunctions.startExecution(params).promise();

    let shortenResult = {status: 'RUNNING'};

    await pWhilst(() => shortenResult.status === 'RUNNING',
        async () => shortenResult = await stepFunctions.describeExecution({
            executionArn: execution.executionArn
        }).promise()
    );

    const shortId = JSON.parse(shortenResult.output).shortId;

    const body = {
        url,
        shortId
    };

    return {
        statusCode: 200,
        headers:{
            'content-type': 'application/json'
        },
        body: JSON.stringify(body)
    };
};

module.exports = {shortenUrl};