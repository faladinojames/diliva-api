/**
 * Created by Falade James on 8/14/2018.
 */
const messages = {
    unauthorized: 'Unauthorized',
    access_denied: 'Access denied',
    bad_request: 'Invalid Request',
    balance_error: 'Your balance is insufficient',
    transaction_complete: 'Your Transaction was successful',
    error_occurred: 'An error occurred',
    error_occurred_contact: 'An error occurred. Please contact support',
    business_not_active: 'Business is not activated. Please contact support',
    merchant_does_not_exist: 'Merchant does not exist',
    merchant_not_active: 'Merchant is not active or is blocked',
    internal_error: 'An internal error occurred. Please contact support',
    cannot_use_card: 'Unable to use card',
    invalid_transaction: 'This transaction is invalid',
    cannot_complete_request: 'We are unable to complete your request at this time. Please try again later',
    customer_blocked: 'Customer is blocked. Please contact merchant.',
    object_not_found: 'Entity not found',
    transaction_already_completed: 'Transaction already completed',
    business: {
        insufficient_balance: 'Your balance is insufficient to perform this request',
        customer_already_exists: 'Customer with email already exists',
        customer_not_found: 'Customer not found',
        duplicate_reference: 'Duplicate Reference'
    }
}
module.exports = messages;
