import Stripe from 'stripe';
import { config } from './env';

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

// Create payment intent
export const createPaymentIntent = async (amount: number, currency: string = 'usd', metadata?: any): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Confirm payment
export const confirmPayment = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    throw new Error('Failed to confirm payment');
  }
};

// Retrieve payment intent
export const retrievePaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment retrieval error:', error);
    throw new Error('Failed to retrieve payment intent');
  }
};

// Create refund
export const createRefund = async (paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund> => {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    if (reason) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw new Error('Failed to create refund');
  }
};

// Get payment methods
export const getPaymentMethods = async (customerId: string): Promise<Stripe.PaymentMethod[]> => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  } catch (error) {
    console.error('Stripe payment methods error:', error);
    throw new Error('Failed to retrieve payment methods');
  }
};

// Create customer
export const createCustomer = async (email: string, name?: string, metadata?: any): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });
    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw new Error('Failed to create customer');
  }
};

// Update customer
export const updateCustomer = async (customerId: string, updateData: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.update(customerId, updateData);
    return customer;
  } catch (error) {
    console.error('Stripe customer update error:', error);
    throw new Error('Failed to update customer');
  }
};

// Delete customer
export const deleteCustomer = async (customerId: string): Promise<Stripe.DeletedCustomer> => {
  try {
    const customer = await stripe.customers.del(customerId);
    return customer;
  } catch (error) {
    console.error('Stripe customer deletion error:', error);
    throw new Error('Failed to delete customer');
  }
};

// Create charge (alternative to payment intent)
export const createCharge = async (amount: number, currency: string = 'usd', source: string, description?: string): Promise<Stripe.Charge> => {
  try {
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      source,
      description,
    });
    return charge;
  } catch (error) {
    console.error('Stripe charge error:', error);
    throw new Error('Failed to create charge');
  }
};

// Webhook signature verification
export const verifyWebhookSignature = (payload: string, signature: string): boolean => {
  try {
    const webhookSecret = config.stripe.webhookSecret;
    if (!webhookSecret) {
      console.warn('Stripe webhook secret not configured');
      return false;
    }

    stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return true;
  } catch (error) {
    console.error('Stripe webhook signature verification error:', error);
    return false;
  }
};

// Get account balance
export const getAccountBalance = async (): Promise<Stripe.Balance> => {
  try {
    const balance = await stripe.balance.retrieve();
    return balance;
  } catch (error) {
    console.error('Stripe balance retrieval error:', error);
    throw new Error('Failed to retrieve account balance');
  }
};

// Create payout
export const createPayout = async (amount: number, currency: string = 'usd'): Promise<Stripe.Payout> => {
  try {
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
    });
    return payout;
  } catch (error) {
    console.error('Stripe payout error:', error);
    throw new Error('Failed to create payout');
  }
};

export default stripe;