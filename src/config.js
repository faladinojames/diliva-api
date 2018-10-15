/**
 * Created by Falade James on 8/14/2018.
 */

const Config = {
    defaultCustomerMail: process.env.DEFAULT_CUSTOMER_EMAIL,
    defaultCountry: process.env.DEFAULT_COUNTRY,
    defaultCurrency: process.env.DEFAULT_CURRENCY,
    defaultBusinessLogo: process.env.DEAFULT_COMPANY_LOGO_URL,
    gatewayUrl: process.env.GATEWAY_URL,
    masterKey: process.env.MASTER_KEY,
    serverUrl: process.env.SERVER_URL,
    baseUrl: process.env.BASE_URL,
    publicKey: process.env.INNSTAPAY_PUBLIC_KEY,
    registerUrl: process.env.REGISTER_URL,
    webhooks:{
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT)
    },
    merchantStatuses: {
      active: 'active',
      pending: 'pending',
      blocked: 'blocked'
    },
    bankCodes:{
        gtBank: '058',
        firstBank: '011',
        zenithBank: '057'
    },
    flutterwave: {
        publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
        privateKey: process.env.FLUTTERWAVE_PRIVATE_KEY,
        getBanksUrl: process.env.FLUTTERWAVE_GET_BANKS_URL,
        baseUrl: process.env.FLUTTERWAVE_BASE_URL,
        createBankTransferUrl: process.env.FLUTTERWAVE_BASE_URL + '/v2/gpx/transfers/create',
        createBankBulkTransferUrl: process.env.FLUTTERWAVE_BASE_URL + '/v2/gpx/transfers/create_bulk',
        verifyBankAccountUrl: process.env.FLUTTERWAVE_LIVE_API_BASE_URL + '/resolve_account',
        verifyTransactionUrl: process.env.FLUTTERWAVE_LIVE_VERIFY_TRANSACTION_URL,
        chargeUrl: process.env.FLUTTERWAVE_LIVE_CHARGE_URL,
        verifyChargeUrl: process.env.FLUTTERWAVE_LIVE_VALIDATE_CHARGE_URL,
        successCode: '00',
        requiresValidationCode: '02',
        webhookHash: process.env.FLUTTERWAVE_SECRET_HASH
    },
    classes: {
        businessCustomer: 'BusinessCustomer',
        paymentClass: 'PaymentTransaction',
        businessTransaction: 'BusinessTransaction',
        businessTransfer: 'BusinessTransfer',
        bankTransfer: 'BankTransfer',
        businessBalance: 'BusinessBalance',
        businessUser: 'BusinessUser',
        businessMetric: 'BusinessMetric',
        businessSettlement: 'BusinessSettlement',
        businessFund: 'BusinessFund',
        businessInvite: 'BusinessInvite',
        businessBank: 'BusinessBank',
        settlement: 'Settlement',
        apiKey: 'ApiKey',
        creditCard: 'CreditCard',
        business: 'Business',
        bank: 'Bank',
    },
    customClients:{
        enyo: {
            publicKey: process.env.INNSTAPAY_PUBLIC_KEY
        }
    },
    businessPermissions: {
        updateBusiness: 'update_business'
    }

}
module.exports = Config;
