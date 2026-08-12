import { getDbPool } from '/opt/nodejs/db/connection.js';
// import { getDbPool} from '../shared/nodejs/db/connection.js'

export const handler = async (event) => {
    try {
        const configurationId = event.pathParameters?.configurationId;
        const preferenceId = event.pathParameters?.preferenceId;
        const userId = event?.requestContext?.authorizer?.jwt?.claims?.sub;

        const dbPool = await getDbPool('write_read_rds_db');

        const result = await dbPool.query(
            'DELETE FROM "NotificationPreference" WHERE "Id" = $1 AND "userId" = $2 AND "configId" = $3',
            [preferenceId, userId, configurationId]
        );

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: {
                        message: 'Not found.',
                    },
                }),
            };
        }

        return { statusCode: 204, body: '',  };
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: { message: e.message },
            }),
        };
    }
};
