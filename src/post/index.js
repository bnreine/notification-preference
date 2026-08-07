import _ from 'lodash';

export const handler = async (event) => {
  const configurationId = event.pathParameters?.configurationId ?? 'unknown';
  const greeting = _.capitalize('hello world');

  return {
    statusCode: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `${greeting} from notification-preference post`,
      configurationId,
      lodashVersion: _.VERSION,
    }),
  };
};
