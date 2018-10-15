/**
 * Created by James Falade on 19/09/2018.
 */
const express = require('express');
const Location = require('./location');
const Task = require('./task');
const bearerToken = require('express-bearer-token');
const HttpStatus = require('http-status-codes');
const Raven = require('raven');
const route = express.Router();
const Utilities = require('../../utilities');
route.use(bearerToken());
route.use(async function (req, res, next) {
    const merchantKey = req.token;

    if (!merchantKey){
        res.status(HttpStatus.UNAUTHORIZED).send('unauthorized');
        return;
    }

    try{
        const merchant = await Utilities.getMerchantFromApiKey(merchantKey);

        if (!merchant){
            res.status(HttpStatus.UNAUTHORIZED)
                .send({
                    status: false,
                    error: HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)
                });
        } else if(merchant.get('status') !== Utilities.config.merchantStatuses.active){
            res.status(HttpStatus.UNAUTHORIZED).send({
                status: false,
                message: Utilities.messages.merchant_not_active
            });
        } else {
            req.merchant = merchant;

            Raven.setContext({
                merchant: {
                    id: merchant.id,
                }
            });

            next();
        }
    } catch (e){
        res.status(401).send(e.message || e);
    }
});


route.use('/location', Location);
route.use('/tasks', Task);
route.get('/', function (req, res) {
    res.send('hello to you')
});


module.exports = route;
