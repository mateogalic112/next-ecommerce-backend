"use strict";

const { sanitizeEntity } = require("strapi-utils");

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
   * @return {string} Stripe session id.
   */
  async create(ctx) {
    const { cartItems } = ctx.request.body;

    if (cartItems.length === 0) {
      return ctx.throw(400, "Cart is empty");
    }

    const { user } = ctx.state;

    const BASE_URL = ctx.request.headers.origin || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cartItems.map((item) => ({
        name: item.product.name,
        amount: item.product.price * 100,
        currency: "usd",
        quantity: item.quantity,
      })),
      customer_email: user.email, //Automatically added by Magic Link
      mode: "payment",
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: BASE_URL,
    });

    // Create order
    await strapi.services.order.create({
      customer: user.id,
      order_details: cartItems,
      total: cartItems
        .reduce((acc, item) => acc + item.product.price * item.quantity, 0)
        .toFixed(2),
      status: "unpaid",
      checkout_session: session.id,
    });

    return { id: session.id };
  },

  /**
   * Confirm order.
   *
   * @return {Object}
   */
  async confirm(ctx) {
    const { checkout_session } = ctx.request.body;
    const session = await stripe.checkout.sessions.retrieve(checkout_session);

    const foundEntity = await strapi.services.order.findOne({
      checkout_session,
    });

    if (session.payment_status === "paid") {
      const entity = await strapi.services.order.update(
        {
          id: foundEntity.id,
        },
        {
          status: "paid",
        }
      );

      return sanitizeEntity(entity, { model: strapi.models.order });
    } else {
      ctx.throw(
        400,
        "It seems like the order wasn't verified, please contact support"
      );
    }
  },
};
