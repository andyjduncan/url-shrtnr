'use strict';

const AWS = require('aws-sdk-mock');

const lolex = require('lolex');

const managementApi = require('./management-api');

const randString = () => Math.random().toString(36).substr(2, 5);

const saveUrlArn = randString();

const url = randString();

const shortId = randString();

beforeEach(() => {
    AWS.restore();
    process.env.SAVE_URL = saveUrlArn;
});

describe('url saving', () => {
    it('triggers the save url step function with the posted url' , async () => {
        const now = new Date();
        const clock = lolex.install({now});

        const stepFunctions = AWS.mock('StepFunctions', 'startExecution', (params, callback) => {
            expect(params.stateMachineArn).toMatch(saveUrlArn);
            expect(params.input).toMatch(JSON.stringify({url: url}));
            expect(params.name).toMatch(`${url}-${now.getTime()}`);

            callback(null, {executionArn: randString()});
        });

        AWS.mock('StepFunctions', 'describeExecution', {output: '{}'});

        await managementApi.shortenUrl({
            body: JSON.stringify({url: url})
        });

        expect(stepFunctions.stub.calledOnce).toBeTruthy();

        clock.uninstall();
    });

    it('returns the short id for the url', async () => {
        const executionArn = randString();

        AWS.mock('StepFunctions', 'startExecution', {executionArn});

        AWS.mock('StepFunctions', 'describeExecution', (params, callback) => {
            expect(params.executionArn).toMatch(executionArn);

            callback(null, {
                status: 'SUCCEEDED',
                output: JSON.stringify({url, shortId})
            });
        });

        const response = await managementApi.shortenUrl({
            body: JSON.stringify({url})
        });

        const responseBody = JSON.parse(response.body);

        expect(responseBody.url).toMatch(url);
        expect(responseBody.shortId).toMatch(shortId);
    });

    it('polls for the execution result', async () => {
        const executionArn = randString();

        AWS.mock('StepFunctions', 'startExecution', {executionArn});

        const describeResults = [
            {status: 'RUNNING'},
            {status: 'SUCCEEDED'},
            {
                status: 'SUCCEEDED',
                output: JSON.stringify({url, shortId})
            }
        ];

        AWS.mock('StepFunctions', 'describeExecution', (params, callback) => {
            expect(params.executionArn).toMatch(executionArn);

            callback(null, describeResults.shift());
        });

        const response = await managementApi.shortenUrl({
            body: JSON.stringify({url})
        });

        const responseBody = JSON.parse(response.body);

        expect(responseBody.url).toMatch(url);
        expect(responseBody.shortId).toMatch(shortId);
    });

    it('returns a successful http result', async () => {
        const executionArn = randString();

        AWS.mock('StepFunctions', 'startExecution', {executionArn});

        AWS.mock('StepFunctions', 'describeExecution', {
            status: 'SUCCEEDED',
            output: JSON.stringify({url, shortId})
        });

        const response = await managementApi.shortenUrl({
            body: JSON.stringify({url})
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch('application/json');
    });
});