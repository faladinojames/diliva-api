const Utilities = require('../utilities');

class MerchantWallet extends Parse.Object{
    constructor(){
        super('MerchantWallet')
    }

    async credit({ref, type, amount}){


        console.log('crediting wallet')
        const transaction = new Parse.Object('MerchantTransaction');
        transaction.set('action', 'credit');
        transaction.set('amount', amount);
        transaction.set('ref', ref);
        transaction.set('type', type);
        transaction.set('merchant', this.get('merchant'));


        const balance = this.get('available_balance') || 0;
        this.set('available_balance', balance  + parseFloat(amount));


         await transaction.save(null, masterKey);
         await this.save(null, masterKey);


         return transaction.id;
    }


    async debit({ref, type, amount}){

        const transaction = new Parse.Object('MerchantTransaction');
        transaction.set('action', 'debit');
        transaction.set('amount', amount);
        transaction.set('ref', ref);
        transaction.set('type', type);
        transaction.set('merchant', this.get('merchant'));

        const balance = this.get('available_balance') || 0;

        if (balance < amount){
            Utilities.throwError(Utilities.messages.balance_error);
        }

        this.set('balance', balance  - parseFloat(amount));

        await transaction.save(null, masterKey);

        await this.save(null, masterKey);

        return transaction.id;
    }


}
module.exports = MerchantWallet;
