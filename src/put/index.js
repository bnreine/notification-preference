import { randomUUID } from 'node:crypto';
import { getDbPool } from '/opt/nodejs/db/connection.js';
// import { getDbPool} from '../shared/nodejs/db/connection.js'
import hal from 'halson';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const schema = {
    type: "object",
    properties: {
        destinationId: {
            type: "string",
            format: "uuid"
        },
        configurationId: {
            type: "string",
            format: "uuid"
        },
        enabled: {
            type: "boolean",
        }
    },
    required: ["destinationId", "configurationId", "enabled"],
    additionalProperties: false
};

const validate = ajv.compile(schema);

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
        const destinationId = event.pathParameters?.destinationId;

        const body = JSON.parse(event.body);

        if (!validate({...body, destinationId, configurationId})) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: {
                        message: 'Validation failed.',
                        details: validate.errors?.map((error) => error.message),
                    },
                }),
            };
        }


        const dbPool = await getDbPool('write_read_rds_db');

        const client = await dbPool.connect();

        let returnResource = {}

        try {
            await client.query('BEGIN');

            const config = await dbPool.query(
                'SELECT * FROM "NotificationConfig" WHERE "userId" = $1 AND "Id" = $2',
                [userId, configurationId]
            );

            const destination = await dbPool.query(
                `SELECT *,
                        case
                            when d."channelType" = 'slack' then CONCAT(d."metadata" ->>'workspaceName', ' | ',
                                                                       d."metadata" ->>'channelName')
                            when d."channelType" in ('whatsapp', 'sms') then d."metadata" ->>'phoneNumber'
                            else '' end as "name"
                 FROM "Destination" as d
                 WHERE "userId" = $1
                   AND "id" = $2`,
                [userId, destinationId]
            );

            const destinationItem = destination.rows[0];

            if (config.rows.length === 0 || destination.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        error: {
                            message: 'Not found.',
                        },
                    }),
                };
            }

            const {enabled} = body;

            const {host, 'x-forwarded-proto': protocol} = event.headers;
            const resourceHref = `${protocol}://${host}/configurations/${configurationId}/preferences/${destinationId}`;

            const resource = {
                id: destinationId,
                enabled,
                configId: configurationId,
                channelType: destinationItem.channelType,
                name: destinationItem.name
            }
            returnResource = hal(resource).addLink('self', resourceHref);

            if (enabled) {
                const existingPreferenceQueryResult = await dbPool.query(
                    'SELECT * FROM "NotificationPreference" WHERE "configId" = $1 AND "destinationId" = $2',
                    [configurationId, destinationId]
                );

                if (existingPreferenceQueryResult.rows.length !== 0) {
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(returnResource),
                    };
                }

                const id = randomUUID();
                await dbPool.query(
                    'INSERT INTO "NotificationPreference" ("Id", "configId", "destinationId") VALUES ($1, $2, $3) RETURNING *',
                    [id, configurationId, destinationId],
                );

                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(returnResource),
                };
            }

            await dbPool.query(
                'DELETE FROM "NotificationPreference" where "destinationId" = $1 AND "configId" = $2',
                [destinationId, configurationId]
            );

            await client.query('COMMIT');

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }


        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(returnResource),
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: { message: e.message },
            }),
        };
    }
};
