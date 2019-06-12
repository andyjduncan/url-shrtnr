'use strict';

const AWS = require('aws-sdk/index');

const nanoid = require('nanoid');

const MIN_LENGTH = 2;

const retryGuard = async (input) => {
    const retries = input.hasOwnProperty('retries') ? ++input.retries : 0;

    return Object.assign({}, input, {retries});
};

const generateId = async (input) => {
    const shortId = nanoid(input.retries + MIN_LENGTH);

    return Object.assign({}, input, {shortId});
};

const saveUrl = async (input) => {
    const dynamo = new AWS.DynamoDB.DocumentClient();

    const tableName = process.env.TABLE_NAME;

    const {shortId, url} = input;

    const params = {
        TableName: tableName,
        Item: {
            shortId,
            url
        },
        Expected: {
            shortId: {
                Exists: false
            }
        }
    };

    await dynamo.put(params).promise();

    return input;
};

const restResponse = async (input) => {
    const {url, shortId} = input;
    return {
        statusCode: 200,
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({url, shortId})
    };
};

module.exports = {retryGuard, generateId, saveUrl, restResponse};