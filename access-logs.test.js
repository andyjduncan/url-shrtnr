'use strict';

const AWS = require('aws-sdk-mock');

const Readable = require('stream').Readable;

const zlib = require('zlib');

const randString = () => Math.random().toString(36).substr(2, 5);

const tableName = randString();

const accessLogs = require('./access-logs');

beforeEach(() => {
    process.env.TABLE_NAME = tableName;
    AWS.restore();
});

describe('processing access logs', () => {
    it('increments page views for all shortened URLs', async (done) => {
        const id1 = randString();
        const id2 = randString();

        const gzip = zlib.createGzip();

        const s = new Readable();
        s.push('#Version: 1.0\n');
        s.push('#Fields: cs-uri-stem sc-status\n');
        s.push(`/${id1}\t200\n`);
        s.push(`/${id2}\t200\n`);
        s.push(null);

        s.pipe(gzip);

        const bucket = randString();

        const key = randString();

        const s3Mock = AWS.mock('S3', 'getObject', gzip);

        const shortIds = [id1, id2];

        const dynamoMock = AWS.mock('DynamoDB.DocumentClient', 'update', (params, callback) => {
            expect(params.TableName).toMatch(tableName);
            expect(params.Key.shortId).toMatch(shortIds.shift());
            expect(params.UpdateExpression).toMatch('ADD pageViews :incr');
            expect(params.ExpressionAttributeValues[':incr']).toEqual(1);

            callback();
        });

        const event = {
            Records: [
                {
                    s3: {
                        bucket: {
                            name: bucket
                        },
                        object: {
                            key: key
                        }
                    }
                }
            ]
        };

        accessLogs.processLog(event, null, () => {
            expect(s3Mock.stub.calledOnce).toBeTruthy();
            expect(dynamoMock.stub.calledTwice).toBeTruthy();

            done();
        });
    });
});