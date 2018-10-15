/**
 * Created by Falade James on 8/14/2018.
 */
const Config = require('./config');
const Logger = require('./logger');
const HttpStatus = require('http-status-codes');
const Messages = require('./messages');
const Location = require('./location');
const Constants = require('./constants');
const Utilities = {
    constants: Constants,
    messages: Messages,
    config: Config,
    location: Location,
    logger: Logger,
    httpStatusCodes: HttpStatus,
    async getMerchantFromApiKey(key){
    const merchant  = await new Parse.Query('Merchant').equalTo('apiKey', key).first(masterKey);

    if (merchant){
        return merchant;
    } else {
        this.throwError(this.messages.merchant_does_not_exist);
    }
    },
    throwError(message){
      throw ({self: true, message})
    },

};
module.exports = Utilities
