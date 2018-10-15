const uuid = require('uuid/v4');
const Utilities = require('../src/utilities');
const axios = require('axios');

const Task = require('../src/models/task');
Parse.Object.registerSubclass('Task', Task);


Parse.Cloud.define('updateMerchant', async (req) => {
    const {name, address, email, phone, webhook, apiKey} = req.params;

    const merchant = await Utilities.getMerchantFromApiKey(apiKey);

    if(webhook)
        merchant.set('webhook', webhook);
    merchant.set('address', {
        description: address
    });
    merchant.set('email', email);
    merchant.set('phone', phone);

    if (merchant.get('name') !== name){
        throw("Please contact support to change your business name")
    }

    await merchant.save(null, masterKey);

    return "Business Updated succesfully"

});
Parse.Cloud.define('creditMerchant', async (req) => {
    const {merchantId, apiKey, ref} = req.params;

    const user = req.user;

    try {
        const response = await axios.get(`${process.env.INNSTAPAY_BASE_URL}/transactions/${ref}`, {
            headers: {
                Authorization: `Bearer ${process.env.APERE_INNSTAPAY_PRIVATE_KEY}`
            }
        });

        const transaction = response.data.data;

        if (transaction.queryCount === 1 && transaction.status === 'successful' && transaction.customer.email === user.get('email') && transaction.creditCard) {
            // transaction has only be queried once

            const merchant = await Utilities.getMerchantFromApiKey(apiKey);

            const wallet = await new Parse.Query('MerchantWallet').equalTo('merchant', merchant).first(masterKey);

            const job = queue.create('update_business_balance', {
                amount: transaction.amountWithOutCharges ,
                id: wallet.id
            }).save();

            return "Your account has been credited successfully"
        }
    } catch(e){
        console.error(e);
        Utilities.throwError('Something went wrong')
    }
});
Parse.Cloud.define('addMerchantCreditCard', async (req) => {
  const {merchantId, apiKey, ref} = req.params;

  const user = req.user;

  try{
      const response = await axios.get(`${process.env.INNSTAPAY_BASE_URL}/transactions/${ref}`, {
          headers: {
              Authorization: `Bearer ${process.env.APERE_INNSTAPAY_PRIVATE_KEY}`
          }
      });

      const transaction = response.data.data;

      if (transaction.queryCount === 1 && transaction.status === 'successful' && transaction.customer.email === user.get('email') && transaction.creditCard){
          // transaction has only be queried once

          const merchant = await Utilities.getMerchantFromApiKey(apiKey);

          const creditCard = transaction.creditCard;
          const merchantCreditCard = new Parse.Object('MerchantCreditCard');
          merchantCreditCard.set('bin', creditCard.bin);
          merchantCreditCard.set('last4', creditCard.last4);
          merchantCreditCard.set('brand', creditCard.brand);
          merchantCreditCard.set('expiryMonth', creditCard.expiryMonth);
          merchantCreditCard.set('expiryYear', creditCard.expiryYear);
          merchantCreditCard.set('token', creditCard.token);
          merchantCreditCard.set('merchant', merchant);
          merchantCreditCard.set('email', user.get('email'));

          await merchantCreditCard.save(null, masterKey);

          const wallet = await new Parse.Query('MerchantWallet').equalTo('merchant', merchant).first(masterKey);
          wallet.set('creditCardObject', {
              last4: creditCard.last4,
              bin: creditCard.bin,
              expiryMonth: creditCard.expiryMonth,
              expiryYear: creditCard.expiryYear,
              id: merchantCreditCard.id
          });

          wallet.set('creditCard', merchantCreditCard);

          await wallet.save(null, masterKey);

          return 'Credit Card added successfully'

      } else {
          Utilities.throwError('Invalid Transaction')
      }
  } catch (e) {
      console.error(e);
      Utilities.throwError('Something went wrong')
  }



})
Parse.Cloud.define('createMerchant', async (req) => {
  const {firstName, lastName, email, password, businessName, businessEmail, businessAddress, businessPhone} = req.params;

  const merchant = new Parse.Object('Merchant');
  merchant.set('name', businessName);
  merchant.set('email', businessEmail);
  merchant.set('address', {
    description: businessAddress
  });
  merchant.set('phone', businessPhone);


  const user = new Parse.User();

  user.set('firstName', firstName);
  user.set('lastName', lastName);
  user.set('email', email);
  user.set('username', email);
  user.set('password', password);

  await user.save(null, masterKey);

  merchant.set('createdBy', user);
  merchant.set('owner',user);


  await merchant.save(null, masterKey);

  merchant.set('apiKey', `${merchant.id}-${uuid()}`);


  const roleACL = new Parse.ACL();
  roleACL.setPublicReadAccess(false);

  //create roles
  const adminRole = new Parse.Role(`${merchant.id}_admin`, roleACL);
  adminRole.getUsers().add(user);
  await adminRole.save(null, {useMasterKey: true});

  const businessACL = new Parse.ACL();
  businessACL.setRoleReadAccess(adminRole, true);
  merchant.setACL(businessACL);
  await merchant.save(null, masterKey);


  {
    const wallet = new Parse.Object('MerchantWallet');
    wallet.set('currency', process.env.DEFAULT_CURRENCY);
    wallet.set('available_balance', 0);
    wallet.set('pending_balance', 0);
    wallet.set('merchant', merchant);

    const walletACL = new Parse.ACL();
    walletACL.setRoleReadAccess(adminRole, true);
    wallet.setACL(walletACL);
    await wallet.save(null, masterKey);

  }
    user.relation('merchants').add(merchant);
    await user.save(null, masterKey);


    return 'Account successfully created';
});
