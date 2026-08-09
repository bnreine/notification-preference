import {handler} from '../index';
import getEvent from './get-event';


test('get test', async ()=>{
    const response = await handler(getEvent)
    const temp = 'something'
}, 30000)