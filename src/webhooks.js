/**
 * Created by James Falade on 19/09/2018.
 */

const express = require('express');

const secret = process.env.TOOKAN_WEBHOOK_SECRET;
const route = express.Router();
const Tookan = new (require('./tookan'))(process.env.TOOKAN_API_KEY);
const Utilities = require('./utilities');
const Location = require('./location');
const Task = require('./models/task');
route.post('/tookan/:type/:event', async function (req, res) {
    const payload = req.body;

    console.log('payload');
    console.log(payload);


    try{

        if (payload.tookan_shared_secret !== process.env.TOOKAN_WEBHOOK_SECRET){
            res.status(401).send('not ok');
            return;
        }

        const id = payload.job_id;
        console.log('data');
        console.log(payload);
        let tookanTask;

        let isPickup;
        if (payload.job_type == 0){
            tookanTask = await new Parse.Query('TookanTask').equalTo('pickupId', id.toString()).first(masterKey);
            isPickup = true;
        } else {
            tookanTask = await new Parse.Query('TookanTask').equalTo('deliveryId', id.toString()).first(masterKey);
        }

        const task = await tookanTask.get('task');

        tookanTask.set('status', payload.job_status);

        if (task.get('status') !== Utilities.constants.jobStatuses.merchantCancelled) // dont override merchant's cancellation
            switch(payload.job_status){
                case 1:
                    task.set('status', isPickup ? Utilities.constants.jobStatuses.pickupInitiated : Utilities.constants.jobStatuses.deliveryInitiated);
                    break;
                case 2:
                    task.set('status', isPickup ? Utilities.constants.jobStatuses.pickupCompleted : Utilities.constants.jobStatuses.deliveryCompleted);
                    break;
                case 3:
                    task.set('status', isPickup ? Utilities.constants.jobStatuses.pickupCancelled : Utilities.constants.jobStatuses.deliveryCancelled);
                    break;
                case 8:
                    task.set('status', isPickup ? Utilities.constants.jobStatuses.pickupCancelled : Utilities.constants.jobStatuses.deliveryCancelled);
                    break;
            }

        const o = new Parse.Object("TookanWebhook");
        o.set('payload', payload);
        o.set('type', req.params.type);
        o.set('event', req.params.event);

        await o.save(null, masterKey);
        await task.save(null, masterKey);
        await tookanTask.save(null, masterKey);

        res.send('ok');
    } catch(e){
        console.error(e);
        res.status(500).send('not ok');
    }

});

route.post('/innstapay', function (req, res) {
    const key = req.get('token');

    if (key === process.env.APERE_INNSTAPAY_PRIVATE_KEY){
        const transaction = req.body;

        const o = new Parse.Object('InnstapayTransaction');
        o.set('ref', transaction.transactionReference);
        o.set('amount', transaction.amount);
        o.set('amountWithoutCharges', transaction.amountWithOutCharges);
        o.set('charges', transaction.charges);
        if (transaction.shippingCharges){
            o.set('shippingCharges', transaction.shippingCharges);

        }
        o.set('payload', transaction);

        o.save(null, masterKey);

        res.send('ok')

    } else {
        res.status(400).send('Not allowed');
    }
});
// only for wordpress or when payment was processed by innstapay
route.post('/innstapay/startShipping', async function (req, res) {
   const key = req.get('token');

    if (key === process.env.APERE_INNSTAPAY_PRIVATE_KEY){
        try{
            const transaction = req.body;

            const customer = transaction.customer;
            const metadata = transaction.metadata;
            const merchant = await new Parse.Query('Merchant').get(metadata.shippingMerchant, masterKey);
            const pickupAddress = metadata.pickupAddress;
            const deliveryAddress = metadata.deliveryAddress;



            if (!deliveryAddress.geocode){
                deliveryAddress.geocode = await Location.getGeocodeFromAddress(deliveryAddress.description, deliveryAddress.state, deliveryAddress.lga);
            }


            if (!pickupAddress.geocode){
                pickupAddress.geocode = await Location.getGeocodeFromAddress(pickupAddress.description, pickupAddress.state, pickupAddress.lga);
            }

            const task = new Task();
            task.set('fn', customer.firstName);
            task.set('ln', customer.lastName);
            task.set('email', customer.email);
            task.set('phone', customer.phone);
            task.set('pickupPhone', metadata.pickupPhone || merchant.get('phone'));
            task.set('pickupAddress', pickupAddress || merchant.get('address'));
            task.set('deliveryAddress', deliveryAddress);
            task.set('pickupState', pickupAddress.state);
            task.set('deliveryState', deliveryAddress.state);
            task.set('items', metadata.items);
            task.set('merchant', merchant);
            if (transaction.reference)
                task.set('mRef', transaction.reference);
            task.set('pRef', transaction.transactionReference);


            if (pickupAddress.state === deliveryAddress.state){
                task.set('intra', true);
            }

            let totalWeight = 0;
            metadata.items.forEach((item) => {
                totalWeight += parseInt(item.weight);
            });

            task.set('weight', totalWeight);

            const metrics = await Location.getDistanceMetrics(pickupAddress.geocode, deliveryAddress.geocode);

            if(transaction.shippingCharges >= metrics.charge){
                task.set('charge', metrics.charge);
                if (transaction.shippingCharges !== metrics.charge){
                    task.set('extraCharge', transaction.shippingCharges - metrics.charge);
                }
                task.set('distance', metrics.distance);

                const taskAlreadyExists = await new Parse.Query(Task).equalTo('pRef', transaction.transactionReference).first(masterKey);

                if (taskAlreadyExists){
                    throw ('Task already exists');
                }

                await task.save(null, masterKey);

                //TODO we should probably verify payment was received

                await Tookan.createPickupAndDeliveryTask(task);
                res.json({
                    status: true,
                    message: 'Shipping Processed'
                })
            } else {
                // shipping charges does not correspond with metrics. Possible fraud or shipping prices was changed before order completion
                res.status(401).send('Shipping Charges error');
            }
        } catch(e){
            console.error(e);
            res.status(500).send(e.message);
        }




    } else {
        res.status(400).send('Not allowed');
    }
});

module.exports = route;
