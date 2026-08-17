import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const __dirname = dirname(fileURLToPath(import.meta.url));

let dbPool;

const getDbPool = async (secretName) => {
  if (dbPool) {
    return dbPool;
  }

  try {
    const secretClient = new SecretsManagerClient({});

    const response = await secretClient.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      }),
    );

    const secret = JSON.parse(response.SecretString);

    const baseConfig = {
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
      max: 5,
      idleTimeoutMillis: 30000,
    };

    let poolConfig = {
        host: secret.host,
        ...baseConfig,
        ssl: {
            ca: readFileSync(
                join(__dirname, '../certs/global-bundle.pem'),
                'utf-8',
            ),
            rejectUnauthorized: true,
        },
    }

    if(process.env.NODE_ENV === 'dev'){
        poolConfig = {
            host: 'localhost',
        ...baseConfig,
            ssl: {
            rejectUnauthorized: false,
        },
        }
    } else if(process.env.NODE_ENV === 'sam-local'){
        poolConfig = {
            host: 'host.docker.internal',
            ...baseConfig,
            ssl: {
                rejectUnauthorized: false,
            },
        }
      }

    dbPool = new Pool({
      ...poolConfig,
    });

    await dbPool.query('SELECT 1');
      console.log('Database connected');
    return dbPool
  } catch (err) {
    console.log(err);
    throw new Error('Database connection failed');
  }
};

export { getDbPool };
