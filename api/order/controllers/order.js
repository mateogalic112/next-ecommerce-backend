"use strict";

const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
   * Retruns orders that belong to logged in user.
   *
   * @return {Object}
   */
  async find(ctx) {
    const { user } = ctx.state;
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.order.search({
        ...ctx.query,
        customer: user.id,
      });
    } else {
      entities = await strapi.services.order.find({
        ...ctx.query,
        customer: user.id,
      });
    }

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.order })
    );
  },

  /**
   * Retruns order that belongs to logged in user.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    const { id } = ctx.params;
    const { user } = ctx.state;

    const entity = await strapi.services.order.findOne({
      id,
      customer: user.id,
    });
    return sanitizeEntity(entity, { model: strapi.models.order });
  },
};
