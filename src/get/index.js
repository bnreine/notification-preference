import _ from 'lodash';

export const handler = async (event) => {
  const configurationId = event.pathParameters?.configurationId ?? 'unknown';
  const preferenceId = event.pathParameters?.preferenceId ?? 'unknown';
  const greeting = _.capitalize('hello world');

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
