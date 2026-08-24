import { getDbPool } from '/opt/nodejs/db/connection.js';
// import { getDbPool} from '../shared/nodejs/db/connection.js'
import hal from 'halson'

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const destinationId = event.pathParameters?.destinationId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

        const dbPool = await getDbPool('readonly_rds_db');

        const response = await dbPool.query(
            `SELECT d."id" as "id", np."Id" IS NOT NULL AS "enabled", nc."Id" as "configId", CONCAT(d."metadata"->>'workspaceName', '-',d."metadata"->>'channelName') as "name" FROM "Destination" as d inner join "NotificationConfig" as nc on d."userId" = nc."userId" left join "NotificationPreference" as np on np."destinationId" = d."id" and np."configId" = nc."Id" where nc."userId"=$1 and nc."Id"=$2 and d."id"=$3`,
            [userId, configurationId, destinationId, ]
        );


        if (
            response.rows.length === 0
        ) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: {
                        message: 'Not found.',
                    },
                }),
            };
        }

        const preference = response.rows[0];
        const headers = event.headers;
        const { host, 'x-forwarded-proto': protocol } = headers;

        const resourceHref = `${protocol}://${host}/configurations/${configurationId}/preferences/${destinationId}`;
        const resource = hal(preference).addLink('self', resourceHref);

        return { statusCode: 200, body: JSON.stringify(resource), headers: { 'Content-Type': 'application/json' }, };

    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({error: {details : err.message, message: "internal server error"}}), headers: { 'Content-Type': 'application/json' }, }
    }
};
