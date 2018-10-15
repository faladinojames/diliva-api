/**
 * Created by James Falade on 19/09/2018.
 */

    console.log('starting importing job')

    const states = require('./states.json');
    const lgas = require('./lgas.json');

    console.log(`Total number of states is ${states.length}`)

    const stateObjects = [];
    const lgaObjects = [];
    const localityObjects = [];
    states.forEach( async(stateData) => {
        console.log(`Handling ${stateData.name}`);
        const state = new Parse.Object('State');
        state.set('name', stateData.name);
        state.set('capital', stateData.capital);
        state.set('area', stateData.area);
        state.set('latitude', stateData.latitude);
        state.set('longitude', stateData.longitude);
        state.set('minLong', stateData.minLong);
        state.set('maxLong', stateData.maxLong);
        state.set('minLat', stateData.minLat);
        state.set('maxLat', stateData.maxLat);

        const localGovernmentData = lgas.find((lga) => lga.state === stateData.name);


        if (!localGovernmentData){
            console.error(`${stateData.name}  not found`)
        } else {
            const localGovernments = localGovernmentData.lgas;

            state.set('lgas', localGovernments);
        }


        stateObjects.push(state);

    });

    Parse.Object.saveAll(stateObjects).then(() => {
        console.log('states saved');

        stateObjects.forEach((stateObject) => {
            const stateName = stateObject.get('name');
            const localGovernments = stateObject.get('lgas');

            const localGovernmentData = lgas.find((lga) => lga.state === stateName);

            localGovernments.forEach(async (localGovernmentName) => {
                console.log(`Handling ${localGovernmentName} local government for ${stateName} state`);

                const localGovernment = new Parse.Object('LocalGovernment');
                localGovernment.set('name', localGovernmentName);
                localGovernment.set('state', stateName);
                localGovernment.set('stateObject', stateObject);

                const localities = localGovernmentData.locality;


                const localGovernmentLocalities = (localities.find((locality) => locality.lga === localGovernmentName)).localities;

                localGovernment.set('localities', localGovernmentLocalities);

                lgaObjects.push(localGovernment);

            });

        });

        return Parse.Object.saveAll(lgaObjects, masterKey);






    }).then(() => {

        lgaObjects.forEach((localGovernmentObject) => {
            const localGovernmentLocalities = localGovernmentObject.get('localities');

            localGovernmentLocalities.forEach(async(localityName) => {
                console.log(localityName)
                const locality = new Parse.Object('Locality');
                locality.set('name', localityName);
                locality.set('lga', localGovernmentObject.get('name'));
                locality.set('lgaObject', localGovernmentObject );
                locality.set('state', localGovernmentObject.get('state'));
                locality.set('stateObject', localGovernmentObject.get('stateObject'));
                localityObjects.push(locality);

            });
        });

        return Parse.Object.saveAll(localityObjects, masterKey);


    }).then(() => {
        console.log('import finished')
    }).catch((e) => {
        console.error(e)
    });




