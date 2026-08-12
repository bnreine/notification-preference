import { randomUUID } from 'node:crypto';
import { getDbPool } from '/opt/nodejs/db/connection.js';
// import { getDbPool} from '../shared/nodejs/db/connection.js'
import hal from 'halson';
import { Validator } from 'jsonschema';

const validator = new Validator();

const bodySchema = {
    type: 'object',
    properties: {
        channel: {
            type: 'string',
            enum: ['sms', 'whatsapp', 'slack'],
        },
    },
    required: ['channel'],
};

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

        const body = JSON.parse(event.body);

        const validation = validator.validate(body, bodySchema);
        if (!validation.valid) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: {
                        message: 'Validation failed.',
                        details: validation.errors.map((error) => error.message),
                    },
                }),
            };
        }

        const { channel } = body;
        const dbPool = await getDbPool('write_read_rds_db');

        const config = await dbPool.query(
            'SELECT * FROM "NotificationConfig" WHERE "userId" = $1 AND "Id" = $2',
            [userId, configurationId]
        );

        if (config.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: {
                        message: 'Configuration not found..',
                    },
                }),
            };
        }

        const existing = await dbPool.query(
            'SELECT * FROM "NotificationPreference" WHERE "userId" = $1 AND "configId" = $2 AND "channel" = $3',
            [userId, configurationId, channel]
        );

        if (existing.rows.length > 0) {
            return {
                statusCode: 409,
                body: JSON.stringify({
                    error: {
                        message: 'A preference with this channel already exists for this configuration.',
                    },
                }),
            };
        }

        const id = randomUUID();
        const insertResult = await dbPool.query(
            'INSERT INTO "NotificationPreference" ("Id", "userId", "channel", "configId") VALUES ($1, $2, $3, $4) RETURNING *',
            [id, userId, channel, configurationId]
        );

        const preference = insertResult.rows[0];
        const { host, 'x-forwarded-proto': protocol } = event.headers;
        const resourceHref = `${protocol}://${host}/configurations/${configurationId}/preferences/${preference.Id}`;
        const resource = hal(preference).addLink('self', resourceHref);

        return {
            statusCode: 201,
            headers: {
                Location: resourceHref,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resource),
        };
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: { message: e.message },
            }),
        };
    }
};
