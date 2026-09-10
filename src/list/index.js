import { getDbPool } from '/opt/nodejs/db/connection.js';
import hal from 'halson'
// import { getDbPool} from '../shared/nodejs/db/connection.js'

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const schema = {
    type: "object",
    properties: {
        configurationId: {
            type: "string",
            format: "uuid"
        }
    },
    required: ["configurationId"],
    additionalProperties: false
};

const validate = ajv.compile(schema);

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

        if (!validate({configurationId})) {
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

        const dbPool = await getDbPool('readonly_rds_db');

        const config = await dbPool.query(
            'SELECT * FROM "NotificationConfig" WHERE "userId" = $1 AND "Id" = $2',
            [userId, configurationId]
        );

        if (config.rows.length === 0) {
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



        const response = await dbPool.query(
            `SELECT d."id" as "id", np."Id" IS NOT NULL AS "enabled", nc."Id" as "configId", d."channelType" as "channelType", case when d."channelType" = 'slack' then CONCAT(oa."authData"->>'workspaceName', ' | ',d."metadata"->>'channelName') when d."channelType" in ('whatsapp', 'sms') then d."metadata"->>'phoneNumber' else '' end as "name" FROM "Destination" as d inner join "NotificationConfig" as nc on d."userId" = nc."userId" left join "NotificationPreference" as np on np."destinationId" = d."id" and np."configId" = nc."Id" left join "OAuthConnection" as oa on oa."id"=d."oAuthConnectionId" where nc."userId"=$1 and nc."Id"=$2 and d."deleted" is not true`,
            [userId, configurationId, ]
        );

        const headers = event.headers;
        const { host, 'x-forwarded-proto': protocol } = headers;

        const resourceHref = `${protocol}://${host}/configurations/${configurationId}/preferences`;

        const configPreferences = response.rows.map((pref) => {
            const preferenceHref = `${resourceHref}/${pref.id}`;
            return hal(pref).addLink('self', preferenceHref);
        });

        const resource = hal({})
            .addLink('self', resourceHref)
            .addEmbed('configurationPreferences', configPreferences);

        return { statusCode: 200, body: JSON.stringify(resource), headers: { 'Content-Type': 'application/json' }, };
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
