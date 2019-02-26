'use strict';

const AWS = require('aws-sdk-mock');

const index = require('./index');

const randString = () => Math.random().toString(36).substr(2, 5);

const tableName = randString();

const url = randString();

beforeEach(() => {
    process.env.TABLE_NAME = tableName;
    AWS.restore();
});

describe('generating id', () => {
    it('generates a new id', async () => {
        const response = await index.generateId();

        expect(response.shortId).toMatch(/[-A-Za-z0-9_]{10}/);
    });

    it('passes through the input url', async () => {
        const url = randString();

        const response = await index.generateId({url});

        expect(response.url).toMatch(url);
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

        await index.saveUrl({
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

        await index.saveUrl({
            shortId,
            url
        });

        expect(dynamoMock.stub.calledOnce).toBeTruthy();
    })
});