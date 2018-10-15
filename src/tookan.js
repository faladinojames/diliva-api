/**
 * Created by James Falade on 19/09/2018.
 */

'use strict';
const axios = require('axios');
const baseUrl = 'https://api.tookanapp.com/v2/';
const moment = require('moment');
const jobStatuses = {
    assigned: 0,
    started: 1,
    successful:2,
    failed: 3,
    inProgress: 4,
    unassigned: 6,
    accepted: 7,
    declined: 8,
    cancelled: 9, //by agent
    deleted: 10, //from dashboard or api
};

class Tookan {

    constructor(apiKey){
        this.apiKey = apiKey;
    }

    async getTaskDetails(jobId){
        const request = await axios.post(`${baseUrl}get_task_details`, {
            api_key: this.apiKey,
            job_id: jobId,
            user_id: process.env.TOOKAN_USER_D
        });

        const response = request.data;

        if(response.status === 200){
            //good
            const job = response.data[0];
            const jobStatus = job.job_status;

            let agent = {}; let journey;
            if(job.fleet_id){
                console.log('fid')
                console.log(job.fleet_id)
                const agentObject = await new Parse.Query('Agent').equalTo('tid', job.fleet_id.toString()).first(masterKey);

                if (agentObject) {
                    console.log('obb')
                    agent = {
                        id: agentObject.id,
                        name: `${agentObject.get('firstName')} ${agentObject.get('lastName')}`,
                        phone: agentObject.get('phone'),
                        location: {
                            latitude: job.fleet_latitude,
                            longitude: job.fleet_longitude
                        }
                    }
                }


                if(job.fleet_history_image){
                    agent.journey = `${process.env.BASE_URL}/clients/v1/journey_history_image/${jobId * 399}`
                }

            }

            return{
                agent,
                jobStatus,
                job
            }

        } else {
            throw ({self: true, message: 'Unable to get Task'});
        }
    }
    async createPickupAndDeliveryTask(task){
        const request = await axios.post(`${baseUrl}create_task`, {
            api_key: this.apiKey,
            order_id: task.id,
            job_description: task.get('description') || 'Delivery',
            job_pickup_phone: task.get('pickupPhone'),
            job_pickup_address: task.get('pickupAddress').description,
            job_pickup_latitude: task.get('pickupAddress').geocode.latitude,
            job_pickup_longitude: task.get('pickupAddress').geocode.longitude,
            latitude: task.get('deliveryAddress').geocode.latitude,
            longitude: task.get('deliveryAddress').geocode.longitude,
            job_pickup_datetime: moment().add(24, 'hours'),
            job_delivery_datetime: moment().add(48, 'hours'),
            customer_phone: task.get('phone'),
            customer_address: task.get('deliveryAddress').description,
            customer_username: `${task.get('fn')} ${task.get('ln')}`,
            has_pickup: 1,
            has_delivery: task.get('pickupState') === task.get('deliveryState') ? 1 : 0, // only within the same state
            layout_type: 0,
            tracking_link: 1,
            timezone: -60,
            team_id: process.env.TOOKAN_TEAM_ID,
            auto_assignment: 1,
            notify: 1,
        });

        const response = request.data;
        console.log(response);


        if (response.status === 200){
            task.set('status', 1);

            const o = new Parse.Object('TookanTask');
            o.set('task', task);
            o.set('merchant', task.get('merchant'));
            o.set('pickupId', response.data.job_id.toString());
            o.set('deliveryId', response.data.delivery_job_id.toString());
            o.set('pickupTrackingUrl', response.data.pickup_tracking_link);
            o.set('deliveryTrackingUrl', response.data.delivery_tracing_link || response.data.delivery_tracking_link); // in case they fix the typo
            o.set('jobHash', response.data.job_hash);
            o.set('trackingUrl', response.data.tracking_link);

            o.save(null, masterKey);

            await task.save(null, masterKey);
            await o.save(null, masterKey);
        } else {
            task.set('status', 10);
            await task.save(null, masterKey);
            throw ({self: true, message: 'Unable to create task'});
        }


    }
}
Tookan.jobStatuses = jobStatuses;

module.exports = Tookan;

