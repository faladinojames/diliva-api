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



queue.process('process_business_wallet_transaction', async function (job, done) {



    const type = job.data.type;

    console.log('starting job '+type)

    switch (type) {
        case 'update_business_balance': return updateBusinessBalance(job,done);
        case 'withdraw_from_business': return withdrawFromBusinessWallet(job,done);
    }
});

async function updateBusinessBalance(job, done){

    console.log('update balance')
    console.log(job.data)
    try{
        const walletId = job.data.id;
        const ref = job.data.ref;
        const amount = job.data.amount;

        const wallet = await new Parse.Query('MerchantWallet').get(walletId, masterKey);

        await wallet.credit({ref, amount, type: 'fund'});

        done();
    } catch(e){
        done(e);
        console.error(e)
    }

}

async function withdrawFromBusinessWallet(job, done) {

    let merchantWithdraw;
    try{
        let {walletId, amount, bankCode, accountNo, ref} = job.data;

        amount = parseFloat(amount);

        merchantWithdraw = await new Parse.Query('MerchantWithdraw').get(ref, masterKey);

        const wallet = await new Parse.Query('MerchantWallet').get(walletId, masterKey);

        await wallet.debit({type: 'withdraw', ref, amount});


        await axios.post(`${process.env.INNSTAPAY_BASE_URL}/transfers/bank`, {amount, bankCode, accountNo}, {
            headers: {
                Authorization: `Bearer ${process.env.APERE_INNSTAPAY_PRIVATE_KEY}`
            }
         });

        merchantWithdraw.set('status', 'successful');


    } catch(e){
        if (merchantWithdraw){
            merchantWithdraw.set('status', 'failed');
            merchantWithdraw.set('error', e.message)
        }
        done(e)
    } finally {
        if (merchantWithdraw)
            merchantWithdraw.save(null, masterKey);
    }

}


