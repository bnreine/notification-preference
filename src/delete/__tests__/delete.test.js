import {handler} from '../index';
import deleteEvent from './delete-event';


test('delete test', async ()=>{
    const response = await handler(deleteEvent)
    const temp = 'something'
}, 30000)
