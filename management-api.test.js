'use strict';

const AWS = require('aws-sdk-mock/index');

const lolex = require('lolex');

const managementApi = require('./management-api');

const handlebars = require('handlebars');

const randString = () => Math.random().toString(36).substr(2, 5);

jest.mock('handlebars');

const renderedTemplate = randString();

const template = jest.fn();

template.mockReturnValue(renderedTemplate);

handlebars.compile.mockReturnValue(template);

const saveUrlArn = randString();

const url = randString();

const shortId = randString();

const shortenedRoot = randString();

beforeEach(() => {
    AWS.restore();
    process.env.SAVE_URL = saveUrlArn;
    process.env.SHORTENED_ROOT = shortenedRoot;
});

describe('linking form', () => {
    it('returns the linking form as html', async () => {
        const response = await managementApi.shorteningForm();

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch('text/html');
    });

    it('renders the form from a template', async () => {
        const response = await managementApi.shorteningForm();

        expect(template).toBeCalled();
        expect(response.body).toMatch(renderedTemplate);
    });
});

describe('url saving', () => {
    it('triggers the save url step function with the posted url' , async () => {
        const now = new Date();
        const clock = lolex.install({now});

        const stepFunctions = AWS.mock('StepFunctions', 'startExecution', (params, callback) => {
            expect(params.stateMachineArn).toMatch(saveUrlArn);
            expect(params.input).toMatch(JSON.stringify({url: url}));

            callback(null, {executionArn: randString()});
        });

        AWS.mock('StepFunctions', 'describeExecution', {output: '{}'});

        await managementApi.shortenUrl({
            body: `url=${url}`
        });

        expect(stepFunctions.stub.calledOnce).toBeTruthy();

        clock.uninstall();
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

        const describeMock = AWS.mock('StepFunctions', 'describeExecution', (params, callback) => {
            expect(params.executionArn).toMatch(executionArn);

            callback(null, describeResults.shift());
        });

        await managementApi.shortenUrl({
            body: `url=${url}`
        });

        expect(describeMock.stub.calledThrice).toBeTruthy();
    });

    it('returns a redirect to the shortened url', async () => {
        const executionArn = randString();

        AWS.mock('StepFunctions', 'startExecution', {executionArn});

        AWS.mock('StepFunctions', 'describeExecution', {
            status: 'SUCCEEDED',
            output: JSON.stringify({url, shortId})
        });

        const response = await managementApi.shortenUrl({
            body: `url=${url}`
        });

        expect(response.statusCode).toBe(303);
        expect(response.headers['location']).toMatch(`/${shortId}`);
    });

});