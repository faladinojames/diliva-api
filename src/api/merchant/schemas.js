const Joi = require('joi');
const customerSchema = Joi.object().keys({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required()
});

const addressSchema = Joi.object().keys({
    description: Joi.string(),
    state: Joi.string(),
    city: Joi.string(),
    lga: Joi.string(),
    geocode: Joi.object(),
}).or('description', 'geocode'); //one of the two must be provided

const createTaskSchema = Joi.object().keys({
    customer: customerSchema.required(),
    deliveryAddress: addressSchema.required(),
    pickupTime: Joi.string().isoDate(),
    deliveryTime: Joi.string().isoDate(),
    pickupAddress: addressSchema,
    pickupPhone: Joi.string(),
    reference: Joi.string(),
    items: Joi.array().items(Joi.object({
        weight: Joi.number().required(),
        name: Joi.string().required(),
        sku: Joi.string(),
        quantity: Joi.number(),
        price: Joi.number().required()
    })).required()

});

module.exports = {
    createTaskSchema
};


