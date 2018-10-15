/**
 * Created by James Falade on 19/09/2018.
 */
'use strict';
const express = require('express');
const HttpStatus = require('http-status-codes');
const Raven = require('raven');
const route = express.Router();
const request = require('request');
const Utilities = require('../../utilities');
const Location = Utilities.location;
const axios = require('axios');
const privateKey = process.env.APERE_APERE_PRIVATE_KEY;
const innstapayBaseUrl = process.env.INNSTAPAY_BASE_URL;
const innstapayKey = process.env.APERE_INNSTAPAY_PRIVATE_KEY;
const Tookan = new (require('../../tookan'))(process.env.TOOKAN_API_KEY);


//TODO verify req.query.id for every get request
route.post('/completeOrder', async (req, res) => {
    const {id, paymentRef} = req.body;

    try{
        const order = await new Parse.Query('Order').equalTo('status', 'created').include('merchant').include('customer').include('address').get(id, masterKey);

        const address = order.get('address');
        const customer = order.get('customer');
        const merchant = order.get('merchant');

        const response = await axios.get(`${innstapayBaseUrl}/transactions/${paymentRef}`, {}, {
            headers: {
                'Authorization': `Bearer ${innstapayKey}`
            }
        });

        const transaction = response.data.data;

        if (transaction.status === 'successful'){
            // transaction successful
            if(transaction.queryCount === 1){

                const task = new Parse.Object('Task');
                task.set('customerFirstName', customer.get('firstName'));
                task.set('customerLastName', customer.get('lastName'));
                task.set('customerEmail', customer.get('email'));
                task.set('customerPhone', customer.get('phone'));
                task.set('pickUpPhone', order.get('pickUpPhone') || merchant.get('phone'));
                task.set('pickUpAddress', order.get('pickUpAddress') || merchant.get('address'));
                task.set('deliveryAddress', address.get('desc'));
                task.set('deliveryLat', address.get('lat'));
                task.set('deliveryLong', address.get('long'));


                await task.save(null, masterKey);

                await Tookan.createPickupAndDeliveryTask(task);


                order.set('status', 'initiated');
                await order.save(null, masterKey);
                res.send('Your order was successfully created. You will receive updates via phone and email.');

            } else {
                res.status(HttpStatus.BAD_REQUEST).send('Transaction Deemed Invalid')
            }
        } else {
            res.status(HttpStatus.BAD_REQUEST).send('Transaction was not successful')
        }

    } catch(e){

    }


});
route.get('/getOrderDetails', async (req, res) => {
   const id = req.query.id;

   try{
       const order = await new Parse.Query('Order').equalTo('status', 'created').include('customer').get(id, masterKey);
       if (order){
       const customer = order.get('customer');
       const amount = order.get('itemAmount');

        let firstName, lastName, email, phone;
       if (customer){
         firstName = customer.get('firstName');
         lastName = customer.get('lastName');
         email = customer.get('email');
         phone = customer.get('phone');
       }

        res.json({
            id, amount, customer: {firstName, lastName, email, phone}
        })
       } else {
           res.status(HttpStatus.BAD_REQUEST).send('Order not found or already completed')
       }
   } catch (e){

   }
});
route.get('/getAddressDetails', async function (req, res) {
    const address = req.query.address;
    const lat = req.query.lat;
    const long  = req.query.long;
    const orderId = req.query.id;


    if (lat && long){
        const states = await new Parse.Query('State').ascending('name').find(masterKey);

        const capitals = states.map((state) => state.get('capital'));

        console.log(capitals)

        for (const state of states){
            if ((lat >= state.get('minLat') && lat <= state.get('maxLat')) && (long >= state.get('minLong')) && long <= state.get('maxLong')){
                console.log('state found');
                console.log(state.get('name'))
            }
        }
        res.send('cool')
    }
});

route.get('/getStateFromCode', async function (req, res) {
    const code = req.query.code;
    const state = await new Parse.Query('State').equalTo('iso', code).first(masterKey);
    res.send(state.get('name'));
});
route.get('/getLocalGovernments', async function (req, res) {
   const state = req.query.state;
   const LocalGovernments = await new Parse.Query('LocalGovernment').equalTo('state', state).find(masterKey);

   res.json(LocalGovernments.map((localGovernment) => localGovernment.get('name')));

});

route.get('/getDeliveryEstimate', async function (req, res) {
    let address = req.query.address;
    const lat = req.query.lat;
    const long  = req.query.long;
    const orderId = req.query.id;

    let deliveryAddress;
    const {state, lga} = req.query;


    if (state && lga){
        deliveryAddress = await Location.getGeocodeFromAddress(address, state, lga);
    } else {
        deliveryAddress = {latitude: lat, longitude: long};
    }



    try{
        const order = await new Parse.Query('Order').equalTo('status', 'created').include('address').include('merchant').get(orderId, masterKey);


        if (true){
            const pickupAddress = order.get('pickupAddress') || order.get('merchant').get('address');
            const metrics = await Location.getDistanceMetrics(pickupAddress.geocode, deliveryAddress );

            res.send(metrics.charge.toString());
        }
    } catch(e){
        console.log(e);
        res.send('hiii')
    }

});


route.get('/journey_history_image/:id', async function (req, res) {
    const id = parseInt(req.params.id)/399;

    const task = await Tookan.getTaskDetails(id);

    if (task.job.fleet_history_image)
        request(task.job.fleet_history_image).pipe(res);
    else{
        res.status(404).send('not found');
    }
});

module.exports = route;
