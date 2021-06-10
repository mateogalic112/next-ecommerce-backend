"use strict";

const { sanitizeEntity } = require("strapi-utils");

const fromDecimalToInt = (number) => parseInt(number * 100);

const stripe = require("stripe")(process.env.STRIPE_SK);
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

  /**
   * Creates order and checkout session that belongs to logged in user.
   *
   * @return {Object}
   */
  async create(ctx) {
    const { product } = ctx.request.body;

    if (!product) {
      return ctx.throw(400, "No product");
    }

    const realProduct = await strapi.services.product.findOne({
      id: product.id,
    });

    if (!realProduct) {
      return ctx.throw(404, "No product finb");
    }

    const { user } = ctx.state;

    const BASE_URL = ctx.request.headers.origin || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: realProduct.name,
            },
            unit_amount: fromDecimalToInt(realProduct.price),
          },
          quantity: 1,
        },
      ],
      customer_email: user.email, //Automatically added by Magic Link
      mode: "payment",
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: BASE_URL,
    });

    // Create order
    const newOrder = await strapi.services.order.create({
      customer: user.id,
      products: [realProduct.id],
      total: realProduct.price,
      status: "unpaid",
      checkout_session: session.id,
    });

    return { id: session.id };
  },
};
