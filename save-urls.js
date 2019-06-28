'use strict';

const AWS = require('aws-sdk/index');

const nanoid = require('nanoid');

const ID_LENGTH = 10;

const retryGuard = async (input) => {
    const retries = input.hasOwnProperty('retries') ? ++input.retries : 0;

    return Object.assign({}, input, {retries});
};

const generateId = async (input) => {
    const shortId = nanoid(ID_LENGTH);

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

module.exports = {retryGuard, generateId, saveUrl};