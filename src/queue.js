/**
 * Created by James Falade on 17/08/2018.
 */
const kue = require('kue');
const axios = require('axios');
const Utilities = require('./utilities');


let queue;
if (process.env.NODE_ENV === "DEV"){
    queue = kue.createQueue({prefix: 'apere'});
} else if (process.env.REDIS_URL){
    queue = kue.createQueue({
        redis: process.env.REDIS_URL
    });
} else{

    queue= kue.createQueue({
        prefix: 'apere',
        redis: {
            host: process.env.REDIS_HOST,
            auth: process.env.REDIS_AUTH,
            options: {
                // see https://github.com/mranney/node_redis#rediscreateclient
            }
        }
    });
}


global.queue = queue;

queue.process('update_business_balance', async function (job, done) {

    console.log('starting job')
    const walletId = job.data.id;
    const amount = job.data.amount;

    const wallet = await new Parse.Query('MerchantWallet').get(walletId, masterKey);

    wallet.increment('available_balance', amount);

    await wallet.save(null, masterKey);

    done();

})
