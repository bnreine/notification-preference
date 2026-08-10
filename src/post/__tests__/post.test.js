import {handler} from '../index';
import postEvent from './post-event';


test('post test', async ()=>{
    const response = await handler(postEvent)
    const temp = 'something'
}, 30000)
