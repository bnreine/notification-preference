import _ from 'lodash';
import doNothing from '/opt/nodejs/do-nothing'
// import doNothing from '../shared/nodejs/do-nothing'

export const handler = async (event) => {
  const configurationId = event.pathParameters?.configurationId ?? 'unknown';
  const greeting = doNothing();

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `${greeting} from notification-preference list`,
      configurationId,
      lodashVersion: _.VERSION,
    }),
  };
};
