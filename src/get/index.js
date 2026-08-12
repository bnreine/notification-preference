import _ from 'lodash';
import { getDbPool } from '/opt/nodejs/db/connection.js';
// import { getDbPool} from '../shared/nodejs/db/connection.js'
import hal from 'halson'

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const preferenceId = event.pathParameters?.preferenceId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

        const dbPool = await getDbPool('readonly_rds_db');

        const response = await dbPool.query(
            'SELECT * FROM "NotificationPreference" WHERE "Id" = $1 AND "userId" = $2 AND "configId"=$3',
            [preferenceId, userId, configurationId]
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

        const resourceHref = `${protocol}://${host}/configurations/${configurationId}/preferences/${preference.Id}`;
        const resource = hal(preference).addLink('self', resourceHref);

        return { statusCode: 200, body: JSON.stringify(resource), headers: { 'Content-Type': 'application/json' }, };

    } catch (err) {
        return res.status(500).json({
            error: {details : err.message, message: "internal server error"}
        });
    }





  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `${greeting} from notification-preference get`,
      configurationId,
      preferenceId,
      lodashVersion: _.VERSION,
    }),
  };
};
