# Backend API Updates Needed for Checkout

This frontend keeps the current UI, but needs backend APIs to follow the same checkout logic as the Odoo website flow:

`cart -> customer/address -> draft order -> delivery -> payment -> payment validation`

## Main Requirement

The same checkout logic must work for both:

- Guest user, without login
- Logged-in customer, using `partner_id`

For guest checkout, backend should create or reuse a customer partner from the submitted customer/address data before delivery/payment APIs are used.

## 1. Cart APIs

Existing endpoints:

- `/api/cart`
- `/api/cart/add`
- `/api/cart/update`
- `/api/cart/remove`
- `/api/cart/clear`

Required add/update payload:

```json
{
  "product_id": 123,
  "available_variant_id": 123,
  "quantity": 1,
  "line_id": 456
}
```

Expected response:

```json
{
  "message": "success",
  "cart": {
    "id": 1001,
    "access_token": "optional",
    "order_lines": [],
    "amount_untaxed": 100,
    "amount_tax": 18,
    "amount_total": 118,
    "currency": "INR"
  },
  "cart_quantity": 1
}
```

Please always return cart/order `id` because frontend uses it as `order_id`.

## 2. Countries and States

Frontend should show country/state names, but send ids to backend.

Endpoints:

- `/api/countries`
- `/api/states`

Countries response:

```json
{
  "message": "success",
  "countries": [
    { "id": 104, "name": "India" }
  ]
}
```

States request:

```json
{
  "country_id": 104
}
```

States response:

```json
{
  "message": "success",
  "country_id": 104,
  "states": [
    { "id": 1, "name": "Maharashtra" }
  ]
}
```

Also acceptable: Odoo many2one style arrays like `[104, "India"]`, but object format is preferred.

## 3. Address APIs

Existing endpoints:

- `/api/customer/address/list`
- `/api/customer/address/create`
- `/api/customer/address/update`

Create/update payload:

```json
{
  "partner_id": 10,
  "type": "delivery",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9999999999",
  "mobile": "9999999999",
  "street": "Street 1",
  "street2": "Area",
  "city": "Mumbai",
  "zip": "400001",
  "state_id": 1,
  "country_id": 104
}
```

Expected response:

```json
{
  "message": "success",
  "address": {
    "id": 20,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9999999999",
    "mobile": "9999999999",
    "street": "Street 1",
    "street2": "Area",
    "city": "Mumbai",
    "zip": "400001",
    "state_id": 1,
    "state": "Maharashtra",
    "country_id": 104,
    "country": "India"
  }
}
```

## 4. Order Create API

Endpoint:

- `/api/order/create`

Frontend now calls order create before delivery/payment, same as website logic.

For logged-in customer, frontend sends `partner_id` and selected address ids.

For guest customer, frontend sends customer and shipping/billing objects. Backend should create or reuse partner using email/phone.

Guest payload example:

```json
{
  "order_id": 1001,
  "customer": {
    "name": "Guest User",
    "email": "guest@example.com",
    "phone": "+91 9999999999",
    "mobile": "+91 9999999999",
    "street": "Street 1",
    "street2": "Area",
    "city": "Mumbai",
    "zip": "400001",
    "state_id": 1,
    "country_id": 104
  },
  "shipping": {
    "name": "Guest User",
    "email": "guest@example.com",
    "phone": "+91 9999999999",
    "mobile": "+91 9999999999",
    "street": "Street 1",
    "street2": "Area",
    "city": "Mumbai",
    "zip": "400001",
    "state_id": 1,
    "country_id": 104
  },
  "billing": {
    "name": "Guest User",
    "email": "guest@example.com",
    "phone": "+91 9999999999",
    "mobile": "+91 9999999999",
    "street": "Street 1",
    "street2": "Area",
    "city": "Mumbai",
    "zip": "400001",
    "state_id": 1,
    "country_id": 104
  },
  "is_guest_checkout": true,
  "guest_checkout": true,
  "create_guest_partner": true,
  "detach_cart": false
}
```

Important:

- If `order_id` is present, update/use that existing cart order.
- Do not create another duplicate sale order.
- If `order_id` is missing, then backend can create order from `lines`.
- Return `order.id`, `access_token`, totals, delivery fields, and address/partner info.

Expected response:

```json
{
  "message": "success",
  "payment_required": true,
  "next_step": "delivery",
  "order": {
    "id": 1001,
    "access_token": "optional",
    "partner_id": 55,
    "amount_untaxed": 100,
    "amount_tax": 18,
    "amount_total": 118,
    "currency": "INR",
    "order_lines": []
  }
}
```

## 5. Delivery APIs

Endpoints:

- `/api/delivery/methods`
- `/api/delivery/apply`

Methods request:

```json
{
  "order_id": 1001,
  "access_token": "optional",
  "partner_id": 55,
  "partner_shipping_id": 20,
  "partner_invoice_id": 21,
  "include_rates": true
}
```

Methods response:

```json
{
  "message": "success",
  "order": {},
  "delivery_methods": [
    {
      "id": 5,
      "name": "Standard Delivery",
      "price": 100,
      "available": true,
      "message": ""
    }
  ]
}
```

Apply request:

```json
{
  "order_id": 1001,
  "carrier_id": 5,
  "delivery_id": 5,
  "partner_shipping_id": 20,
  "partner_invoice_id": 21
}
```

Apply response:

```json
{
  "message": "success",
  "delivery": {},
  "cart": {
    "id": 1001,
    "carrier_id": 5,
    "delivery_price": 100,
    "amount_total": 218
  }
}
```

### Delivery ZIP Range Type Fix

If backend throws this error:

```text
'<=' not supported between instances of 'str' and 'float'
```

It is usually caused by delivery carrier ZIP range comparison, for example comparing `zip_from` / `zip_to` strings with a numeric customer ZIP.

Backend should normalize values before comparison:

```python
def _zip_number(value):
    try:
        return float(str(value or '').strip())
    except Exception:
        return False

customer_zip = _zip_number(order.partner_shipping_id.zip)
zip_from = _zip_number(carrier.zip_from)
zip_to = _zip_number(carrier.zip_to)

if customer_zip and zip_from and customer_zip < zip_from:
    # not available
    pass

if customer_zip and zip_to and customer_zip > zip_to:
    # not available
    pass
```

Do not compare raw string and float values with `<=` or `>=`.

## 6. Payment APIs

Endpoints:

- `/api/payment/gateways`
- `/api/payment/transaction`
- `/api/payment/validate`
- `/api/payment/status`

Gateways request:

```json
{
  "order_id": 1001,
  "access_token": "optional"
}
```

Gateways response:

```json
{
  "message": "success",
  "order": {},
  "gateways": [
    {
      "id": 3,
      "name": "Razorpay",
      "provider": "razorpay",
      "payment_flow": "form"
    }
  ],
  "access_token": "optional"
}
```

Transaction request:

```json
{
  "order_id": 1001,
  "access_token": "optional",
  "acquirer_id": 3,
  "gateway_id": 3,
  "amount": 218,
  "currency": "INR",
  "currency_id": 20
}
```

Transaction response:

```json
{
  "message": "success",
  "transaction": {
    "id": 1937,
    "transaction_id": 1937,
    "reference": "Newxyz_779",
    "state": "draft",
    "amount": 218,
    "currency": "INR",
    "acquirer_id": 3,
    "provider": "razorpay"
  },
  "payment_data": {
    "provider": "razorpay",
    "checkout_js": "https://checkout.razorpay.com/v1/checkout.js",
    "key": "rzp_key",
    "amount": 21800,
    "currency": "INR",
    "order_id": "razorpay_order_id_or_odoo_reference",
    "reference": "Newxyz_779",
    "transaction_id": 1937
  }
}
```

## 7. Razorpay Important Fix

Frontend must not call manual capture if Odoo Razorpay acquirer is not allowed for manual capture.

This error must be avoided:

```json
{
  "error": "(\"The ['Razorpay'] payment acquirers are not allowed to manual capture mode!\", None)"
}
```

Backend should support one of these clean flows:

### Preferred

Create Razorpay order in `/api/payment/transaction`, then after Razorpay success, frontend calls `/api/payment/validate` with:

```json
{
  "order_id": 1001,
  "transaction_id": 1937,
  "reference": "Newxyz_779",
  "gateway_payment_id": "pay_xxx",
  "gateway_order_id": "order_xxx",
  "gateway_signature": "signature_xxx"
}
```

Backend should verify signature/status without forcing manual capture.

### If capture is needed

Enable/configure capture properly in Odoo/Razorpay acquirer, then `/api/payment/razorpay/capture` can be used. Otherwise do not require this endpoint from frontend.

## 8. Error Format

Please keep errors simple:

```json
{
  "error": "Human readable error message"
}
```

Avoid returning Python tuple strings where possible.

## 9. Summary of Frontend Expectations

- Country/state names are shown in UI, ids are sent to API.
- Guest and logged-in checkout use same order flow.
- Backend creates/reuses guest partner before delivery/payment.
- Existing `order_id` should be updated, not duplicated.
- Delivery/payment APIs must work from returned `order.id`.
- Razorpay validation should not force manual capture unless backend is configured for it.
