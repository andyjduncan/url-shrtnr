'use strict';

const AWS = require('aws-sdk');

const zlib = require('zlib');

const readline = require('readline');

const processLog = (event, context, callback) => {
    const tableName = process.env.TABLE_NAME;

    const s3 = new AWS.S3();

    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    const gzip = zlib.createGunzip();

    s3.getObject({
        Bucket: bucket,
        Key: key
    }).createReadStream().pipe(gzip);

    const logLines = readline.createInterface({
        input: gzip,
        crlfDelay: Infinity
    });

    let statusIndex, uriIndex;

    const itemsToUpdate = [];

    logLines
        .on('line', (line) => {
            if (line.startsWith('#Version')) {
                if (!line.endsWith(' 1.0')) {
                    logLines.close();
                    callback(new Error(`Unknown version: ${line}`));
                }
            } else if (line.startsWith('#Fields')) {
                const fields = line.split(' ');
                fields.shift();
                statusIndex = fields.indexOf('sc-status');
                uriIndex = fields.indexOf('cs-uri-stem');
            } else {
                const logFields = line.split('\t');
                const status = logFields[statusIndex];
                const uriMatcher = logFields[uriIndex].match(/\/([A-Za-z0-9_-]+)/);
                if (status === '200' && uriMatcher) {
                    itemsToUpdate.push(uriMatcher[1]);
                }
            }
        })
        .on('close', () => {
            const dynamoDb = new AWS.DynamoDB.DocumentClient();
            const promises = itemsToUpdate.reduce((acc, item) => {
                return [...acc, dynamoDb.update({
                    TableName: tableName,
                    Key: {shortId: item},
                    UpdateExpression: 'ADD pageViews :incr',
                    ExpressionAttributeValues: {':incr': 1}
                }).promise()]
            }, []);

            Promise.all(promises).then(() => callback()).catch(callback);
        });
};

module.exports = {processLog};