import { getDbPool } from '/opt/nodejs/db/connection.js';
import hal from 'halson'
// import { getDbPool} from '../shared/nodejs/db/connection.js'

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

        const dbPool = await getDbPool('readonly_rds_db');
        const response = await dbPool.query('select * from "NotificationPreference" where "userId"=$1 and "configId" = $2', [userId, configurationId]);

        const headers = event.headers;
        const { host, 'x-forwarded-proto': protocol } = headers;

        const resourceHref = `${protocol}://${host}/configurations/${configurationId}/preferences`;

        const configPreferences = response.rows.map((pref) => {
            const preferenceHref = `${resourceHref}/${pref.Id}`;
            return hal(pref).addLink('self', preferenceHref);
        });

        const resource = hal({})
            .addLink('self', resourceHref)
            .addEmbed('configurationPreferences', configPreferences);

        return { statusCode: 200, body: JSON.stringify(resource) };
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: { message: e.message },
            }),
        };
    }
};
