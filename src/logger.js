/**
 * Created by Falade James on 8/14/2018.
 */

const Raven = require('raven');

const Logger = {

    debug(message){
        console.log(message)
    },

    info(message){
        console.log(message)
    },


    reportMessage(message){
        console.log(message)
        Raven.captureMessage(message)
    },

    reportError(e){
        console.error(e);
        Raven.captureException(e);
    }

};
module.exports = Logger;
