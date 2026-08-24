import {handler} from '../index';
import postEvent from './put-event';


test('put test', async ()=>{
    const response = await handler(postEvent)
    const temp = 'something'
}, 30000)
