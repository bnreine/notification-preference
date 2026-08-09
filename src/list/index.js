// import { getDbPool } from '/opt/nodejs/db/connection.js';
import { getDbPool} from '../shared/nodejs/db/connection.js'

export const handler = async (event) => {
  const configurationId = event.pathParameters?.configurationId ?? 'unknown';

  const dbPool = await getDbPool('readonly_rds_db');
  const { rows } = await dbPool.query('SELECT 1');

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'from notification-preference list',
      configurationId,
      dbCheck: rows[0],
    }),
  };
};
