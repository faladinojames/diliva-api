/**
 * Created by Falade James on 8/14/2018.
 */
const constants = {
    success: 'success',
    successful: 'successful',
    initiated: 'initiated',
    cancelled: 'cancelled',
    pending: 'pending',
    error: 'error',
    otp: 'otp',
    blocked: 'blocked',
    active: 'active',
    settlement: 'settlement',
    transfer: 'transfer',
    fund: 'fund',
    jobStatuses : {
        created: 1,
        pickupInitiated: 2,
        pickupCompleted: 3,
        deliveryInitiated: 4,
        deliveryCompleted: 5,
        merchantCancelled: 6,
        pickupCancelled: 7,
        deliveryCancelled: 8,
        couldNotCreate: 10
    }
};

module.exports = constants
