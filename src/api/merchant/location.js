/**
 * Created by James Falade on 26/08/2018.
 */

'use strict';
const express = require('express');
const Utilities = require('../../utilities');
const route = express.Router();

const ErrorHandler = require('../../error_handler');

route.get('/states', async function (req, res) {
    const states = await new Parse.Query('State').limit(1000).find(masterKey);

    const includeLga = req.query.includeLga;
    res.json(states.map((state) => {
        return{
            name: state.get('name'),
            iso: state.get('iso')[0],
            capital: state.get('capital'),
            minLong: state.get('minLong'),
            minLat: state.get('minLat'),
            maxLong: state.get('maxLong'),
            maxLat: state.get('maxLat'),
            lgas: includeLga ? state.get('lgas') : []
        }
    }));

});

route.get('/:state/lgas', async function (req, res) {
    const state = req.params.state;

    try{
        const stateObject = await  new Parse.Query('State').equalTo('name', state).first(masterKey);

        if (stateObject){
            res.json(stateObject.get('lgas'))
        } else {
            res.send('Not found')
        }
    } catch(e){
        console.error(e)
        res.send('Not found')
    }


});
module.exports = route;
