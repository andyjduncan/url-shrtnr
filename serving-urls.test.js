'use strict';

const AWS = require('aws-sdk-mock');

const handlebars = require('handlebars');

const servingApi = require('./serving-api');

const randNumber = () => Math.ceil(10 * Math.random()) + 1;

const randString = () => Math.random().toString(36).substr(2, 5);

jest.mock('handlebars');

const renderedTemplate = randString();

const template = jest.fn();

template.mockReturnValue(renderedTemplate);

handlebars.compile.mockReturnValue(template);

const shortId = randString();

const tableName = randString();

const input = {
    pathParameters: {shortId}
};

const shortenedRoot = randString();

const url = randString();

beforeEach(() => {
    process.env.TABLE_NAME = tableName;
    process.env.SHORTENED_ROOT = shortenedRoot;
    AWS.restore();
});

describe('serving shortened urls', () => {
    it('fetches the url from dynamodb', async () => {
        const dynamodb = AWS.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
            expect(params.TableName).toMatch(tableName);
            expect(params.Key.shortId).toMatch(shortId);

            callback(null, {Item: {url}});
        });

        await servingApi.serveUrl(input);

        expect(dynamodb.stub.calledOnce).toBeTruthy();
    });

    it('substitutes the url into a template', async () => {
        AWS.mock('DynamoDB.DocumentClient', 'get', {Item: {url}});

        await servingApi.serveUrl(input);

        expect(handlebars.compile).toBeCalled();
        expect(template).toBeCalledWith({shortId, shortenedRoot, url});
    });

    it('substitutes the page views into the template if present', async () => {
        const pageViews = randNumber();

        AWS.mock('DynamoDB.DocumentClient', 'get', {Item: {url, pageViews}});

        await servingApi.serveUrl(input);

        expect(handlebars.compile).toBeCalled();
        expect(template).toBeCalledWith({shortId, shortenedRoot, url, pageViews});
    });

    it('returns the rendered template as html', async () => {
        AWS.mock('DynamoDB.DocumentClient', 'get', {Item: {url}});

        const response = await servingApi.serveUrl(input);

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch('text/html');
        expect(response.body).toMatch(renderedTemplate);
    });

    it('sets appropriate cache control headers', async () => {
        const maxAge = Math.floor(600 * Math.random()) + 1;

        process.env.MAX_AGE = maxAge.toString();

        AWS.mock('DynamoDB.DocumentClient', 'get', {Item: {url}});

        const response = await servingApi.serveUrl(input);

        expect(response.headers['cache-control']).toMatch(`public, max-age=${maxAge}`);
    });
});