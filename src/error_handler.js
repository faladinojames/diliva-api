/**
 * Created by James Falade on 16/08/2018.
 */
const Utilities = require('./utilities')
class ErrorHandler{
    static handleError(e, res){
        console.log(e);
        if (e.self){

            Utilities.logger.reportMessage(e.message);

            res.status(400).json({
                status: false,
                message: e.message
            })
        }  else if(e.response) {

            Utilities.logger.reportError(new Error(e.response.data.message));

            // flutterwave error
            console.error(e.response.data);
            res.status(400).send({
                status: false,
                message: e.response.data.message
            })
        } else if (e.message){
            //parse or internal error
            Utilities.logger.reportError(e);
            if (e.code === Parse.Error.OBJECT_NOT_FOUND){
                res.status(400).send({
                    status: false,
                    message: Utilities.messages.object_not_found
                })
            } else {
                res.status(500).send({
                    status: false,
                    message: Utilities.messages.internal_error
                });
            }

        } else {
            Utilities.logger.reportError(e);
            res.status(500).send({
                status: false,
                message: Utilities.messages.internal_error
            });
        }
    }
}

module.exports = ErrorHandler
