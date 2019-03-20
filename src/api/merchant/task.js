/**
 * Created by James Falade on 26/08/2018.
 */

'use strict';
const express = require('express');
const Joi = require('joi');
const Task = require('../../models/task');
const schemas = require('./schemas');
const Utilities = require('../../utilities');
const Location = Utilities.location;
const Tookan = new (require('../../tookan'))(process.env.TOOKAN_API_KEY);
const route = express.Router();
const axios = require('axios');
const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_MAPS_API_KEY,
    Promise: Promise
});


const ErrorHandler = require('../../error_handler');



route.post('/estimate', async function (req, res) {

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log('got estimate request from ',ip, ' merchant: ', req.merchant.id);
    console.log(req.body);

    const deliveryAddress = req.body.deliveryAddress;
    const pickupAddress = req.body.pickupAddress;

    let deliveryLocation, pickupLocation;

    try{

        if(pickupAddress.state === 'LA'){
            res.status(429).send('this kind of request has been flagged for too many request. this ip faces the risk of been blocked if the request persists');
            return;
        }
        if (deliveryAddress.geocode){
            deliveryLocation = deliveryAddress.geocode;
        } else {
            deliveryLocation = await Location.getGeocodeFromAddress(deliveryAddress.description, deliveryAddress.state, deliveryAddress.lga);
        }

        if (pickupAddress.geocode){
            pickupLocation = pickupAddress.geocode;
        } else {
            pickupLocation = await Location.getGeocodeFromAddress(pickupAddress.description, pickupAddress.state, pickupAddress.lga);
        }

        const metrics = await Location.getDistanceMetrics(pickupLocation, deliveryLocation);

        const {distance, duration, charge} = metrics;


        res.json({
            distance,
            // duration,
            charge
        })
    } catch(e){
        ErrorHandler.handleError(e, res);
    }







});

route.post('/initialize', async function (req, res) {
    const data = req.body;

    const merchant = req.merchant;
    const customer = data.customer;

    try{
        const result = Joi.validate(data, schemas.createTaskSchema);

        if(result.error){
            Utilities.throwError(result.error.details[0].message);
        }

        const task = new Parse.Object('Checkout');
        task.set('firstName', customer.firstName);
        task.set('lastName', customer.lastName);
        task.set('email', customer.email);
        task.set('phone', customer.phone);
        task.set('pickupPhone', data.pickupPhone || merchant.get('phone'));
        task.set('pickupAddress', data.pickupAddress || merchant.get('address'));
        task.set('deliveryAddress', data.deliveryAddress);


        await task.save(null, masterKey);

        res.json({
            status: true,
            data: {
                id: task.id,
                checkOutUrl: `${process.env.CHECKOUT_BASE_URL}/${task.id}`
            }
        });
    } catch(e){
        ErrorHandler.handleError(e, res);
    }

});

route.post('/:id/cancel', async function (req, res) {
    const taskId = req.params.id;
    const merchant = req.merchant;

    const taskObject = await new Parse.Query('Task').equalTo('merchant', merchant).get(taskId, masterKey);

    const task = await Tookan.getTaskDetails(taskObject);





});
route.get('/:id', async function (req, res) {
    const taskId = req.params.id;
    const merchant = req.merchant;

    try{
        const task = await new Parse.Query('Task').equalTo('merchant', merchant).get(taskId, masterKey);

        const payload = await task.getPayload();
        res.json({
            status: true,
            data: payload
        });

    } catch(e){
        ErrorHandler.handleError(e, res);
    }
});

route.post('/', async function (req, res) {
    const data = req.body;

    const merchant = req.merchant;
    const customer = data.customer;
    const {deliveryAddress, pickupAddress} = data;
    console.log('create task');
    console.log(data);

    try{

        const result = Joi.validate(data, schemas.createTaskSchema);

        if(result.error){
            Utilities.throwError(result.error.details[0].message);
        }

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
        task.set('pickupPhone', data.pickupPhone || merchant.get('phone'));
        task.set('pickupAddress', pickupAddress || merchant.get('address'));
        task.set('deliveryAddress', deliveryAddress);
        task.set('pickupState', pickupAddress.state);
        task.set('deliveryState', deliveryAddress.state);
        task.set('items', data.items);

        if (pickupAddress.state === deliveryAddress.state){
            task.set('intra', true);
        }

        let totalWeight = 0;
        data.items.forEach((item) => {
            totalWeight += parseInt(item.weight);
        });

        task.set('merchant', merchant);
        if (data.reference)
            task.set('mRef',data.reference);

        task.set('weight', totalWeight);


        const metrics = await Location.getDistanceMetrics(pickupAddress.geocode, deliveryAddress.geocode);


        task.set('charge', metrics.charge);
        task.set('distance', metrics.distance);

        await task.save(null, masterKey);


        const taskData = await task.getPayload();
        delete taskData.tracking; //since tracking is empty for a new task
        // collect payment

        const wallet = await new Parse.Query('MerchantWallet').equalTo('merchant', merchant).include('creditCard').first(masterKey);
        if (wallet.get('available_balance') > metrics.charge){
            // wallet can be charged with amount

            const job = queue.create('process_business_wallet_transaction', {
                amount: - Math.abs(metrics.charge) ,
                type: 'update_business_balance',
                id: wallet.id
            }).save();

            job.on('complete', async function(){
                await Tookan.createPickupAndDeliveryTask(task);
                res.json({
                    status: true,
                    data: taskData
                });
            }).on('failed', function(errorMessage){
              throw ('Transaction failed');
            })


        } else {
            if (wallet.get('creditCard')){
                const creditCard = wallet.get('creditCard');

                const token = creditCard.get('token');
                //charge with token

                const r = await axios.post(`${process.env.INNSTAPAY_BASE_URL}/card/charge/${token}`,{amount: metrics.charge, email: creditCard.get('email')}, {
                    headers: {
                        Authorization: `Bearer ${process.env.APERE_INNSTAPAY_PRIVATE_KEY}`
                    }
                });

                const response = r.data;

                if (response.status === 'success'){
                    task.set('pRef', response.data.transactionReference);
                    await Tookan.createPickupAndDeliveryTask(task);
                    res.json({
                        status: true,
                        data: taskData
                    });
                } else {
                    Utilities.throwError('Unable to charge card');
                }


            } else {
                Utilities.throwError('Insufficient Balance. Please fund account or add a credit card');
            }
        }

    } catch(e){
        ErrorHandler.handleError(e, res);
    }



});
module.exports = route;
