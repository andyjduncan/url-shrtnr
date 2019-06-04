'use strict';

const AWS = require('aws-sdk-mock/index');

const saveUrls = require('./save-urls');

const randString = () => Math.random().toString(36).substr(2, 5);

const tableName = randString();

beforeEach(() => {
    process.env.TABLE_NAME = tableName;
    AWS.restore();
});

describe('generating id', () => {
    it('generates a new id', async () => {
        const response = await saveUrls.generateId();

        expect(response.shortId).toMatch(/^[-A-Za-z0-9_]{10}$/);
    });

    it('passes through the input url', async () => {
        const url = randString();

        const response = await saveUrls.generateId({url});

        expect(response.url).toMatch(url);
    });
});

describe('retry guard', () => {
   it('initialises the retry guard', async () => {
       const result = await saveUrls.retryGuard({});

       expect(result.retries).toBe(0);
   });

   it('increments the retry guard', async () => {
       const result = await saveUrls.retryGuard({retries: 0});

       expect(result.retries).toBe(1);
   });

   it('passes through input properties', async () => {
       const otherProp = randString();

       const result = await saveUrls.retryGuard({otherProp});

       expect(result.otherProp).toMatch(otherProp);
   });
});

describe('storing urls', () => {
    it('saves the url', async () => {
        const url = randString();
        const shortId = randString();

        const dynamoMock = AWS.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            expect(params.TableName).toMatch(tableName);
            expect(params.Item.shortId).toMatch(shortId);
            expect(params.Item.url).toMatch(url);

            callback();
        });

        await saveUrls.saveUrl({
            shortId,
            url
        });

        expect(dynamoMock.stub.calledOnce).toBeTruthy();
    });

    it('does not overwrite an existing url', async () => {
        const url = randString();
        const shortId = randString();

        const dynamoMock = AWS.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
            expect(params.Expected.shortId.Exists).toBeFalsy();

            callback();
        });

        await saveUrls.saveUrl({
            shortId,
            url
        });

        expect(dynamoMock.stub.calledOnce).toBeTruthy();
    });

    it('returns the input', async () => {
        const url = randString();
        const shortId = randString();
        const otherProp = randString();

        AWS.mock('DynamoDB.DocumentClient', 'put');

        const result = await saveUrls.saveUrl({
            shortId,
            url,
            otherProp
        });

        expect(result.shortId).toMatch(shortId);
        expect(result.url).toMatch(url);
        expect(result.otherProp).toMatch(otherProp);
    })
});