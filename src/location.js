/**
 * Created by James Falade on 19/09/2018.
 */

const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_MAPS_API_KEY,
    Promise: Promise
});

class Location{
    static async getStates(includeLga){
        const states = await new Parse.Query('State').limit(1000).find(masterKey);
        return states.map((state) => {
            return{
                name: state.get('name'),
                capital: state.get('capital'),
                minLong: state.get('minLong'),
                minLat: state.get('minLat'),
                maxLong: state.get('maxLong'),
                maxLat: state.get('maxLat'),
                lgas: includeLga ? state.get('lgas') : []
            }
        })
    }

    static async getStateLgas(state){
        return ( await  new Parse.Query('State').equalTo('name', state).first(masterKey)).get('lgas');
    }

    static async getLgaLocalities(state, lga){

    }



    static async getDistanceMetrics(from, to){
       const response = await googleMapsClient.distanceMatrix({origins: `${from.latitude},${from.longitude}`, destinations:  `${to.latitude},${to.longitude}`}).asPromise();

       if (response && response.json && response.json.rows.length > 0 && response.json.rows[0].elements.length > 0){
           const data = response.json.rows[0].elements[0];
           const distance =  data.distance.value/1000; //kilometres
           const duration = data.duration.value/60; //minutes

           const config = await Parse.Config.get();

           const basePrice = config.get('baseDeliveryPrice');
           let distanceCharge = (30 * distance);
           if (distanceCharge < 200){
               distanceCharge = 200;
           }

           const charge = Math.ceil( (distanceCharge + basePrice) / 100) *100;



           return {distance, duration, charge};
       } else {
           // should never happen because should have already checked the address
           throw ({self: true, message: 'Cannot calculate distance metrics'});
       }

    }

    static async getGeocodeFromCoordinates(latitude, longitude){
        const response = await googleMapsClient.reverseGeocode({
            latlng: `${latitude},${longitude}`
        }).asPromise();

        const results = response.json.results;

        console.log(results[0])

        return {latitude, longitude, address_components:results[0].address_components };
    }
    static async getGeocodeFromAddress(address, state, lga){
        const response = await googleMapsClient.geocode({
            address: address
        }).asPromise();

        const results = response.json.results;

        if (results.length > 0){
            const location = results[0].geometry.location;

            const latitude = location.lat;
            const longitude = location.lng;

            return {latitude, longitude, address_components:results[0].address_components };
        } else {
            //attempt from description state and lga


            address = `${lga}, ${state} State, Nigeria`;

            const response = await googleMapsClient.geocode({
                address: address
            }).asPromise();

            if (response.json.results.length > 0){
                const location = response.json.results[0].geometry.location;

                const latitude = location.lat;
                const longitude = location.lng;

                return {latitude, longitude, address_components:response.json.results[0].address_components};
            } else {
                throw({self: true, message: 'Cannot decode address. Please re-enter address.'});
            }

        }



    }
}

module.exports = Location;
