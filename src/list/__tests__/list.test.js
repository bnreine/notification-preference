import {handler} from '../index';
import listEvent from './list-event';


test('list test', async ()=>{
    const response = await handler(listEvent)
    const temp = 'something'
}, 30000)