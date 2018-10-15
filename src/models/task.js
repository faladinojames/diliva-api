const Tookan = new (require('../tookan'))(process.env.TOOKAN_API_KEY);
const Utilities = require('../utilities');
class Task extends Parse.Object{
    constructor(){
        super('Task');
    }

    isInterState(){
        return !this.get('intra');
    }
    isIdle(){
        return this.get('status') === 1;
    }

    getStatus(){
        return this.get('status');
    }

    getCharge(){
        return this.get('charge');
    }

    getDistance(){
        return this.get('distance');
    }

    getDuration(){
        return this.get('duration')
    }

    getType(){
        return this.isInterState() ? 1 : 0;
    }

    async getPickupId(){
        return (await this.getTookanTask()).get('pickupId');
    }

    async getDeliveryId(){
        return (await this.getTookanTask()).get('pickupId');
    }

    async getTookanTask(){
        if (!this.tookanTask){
            this.tookanTask = await new Parse.Query('TookanTask').equalTo('task', this).first(masterKey);
            if (!this.tookanTask){
                Utilities.throwError('Could not get pair');
            }
        }
        return this.tookanTask;
    }
    async getPayload(){
        const data = {
            id: this.id,
            status: this.getStatus(),
            charge: this.getCharge(),
            distance: this.getDistance(),
            type: this.getType()
        };


        if (this.isIdle()){
            return data;
        }

        const tracking = {
            pickup: {},
            delivery: {}
        };

        if (this.getStatus() === Utilities.constants.jobStatuses.pickupInitiated){
            const pickupJob = await Tookan.getTaskDetails(await this.getPickupId());
            console.log('agent')
            console.log(pickupJob)
            tracking.pickup = pickupJob.agent;
        }

        if (this.getStatus() === Utilities.constants.jobStatuses.deliveryInitiated && !this.isInterState()){
            const deliveryJob = await Tookan.getTaskDetails(await this.getPickupId());
            tracking.delivery = deliveryJob.agent;
        }

        data.tracking = tracking;

        return data;

    }
}

module.exports = Task;
