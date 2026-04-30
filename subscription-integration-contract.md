# Subscription Integration Contract

Base URL:
- Production: `https://api-pro.rydlearning.com`
- Local: `http://localhost:3000`

Response envelope (except webhook):
```json
{
  "message": "string",
  "status": true,
  "data": {}
}
```

## Parent Endpoints

### 1) Get plans
**GET** `/parent/subscription/plans`  
Auth: Parent bearer token

Success `data` example:
```json
{
  "monthly": {
    "id": 1,
    "key": "monthly",
    "name": "Monthly",
    "durationMonths": 1,
    "billingCurrency": "NGN",
    "priceLabel": "₦5,000",
    "amountNgn": 5000,
    "features": ["Feature 1", "Feature 2"]
  },
  "annual": {
    "id": 2,
    "key": "annual",
    "name": "Annual",
    "durationMonths": 12,
    "billingCurrency": "NGN",
    "priceLabel": "₦40,000",
    "amountNgn": 40000,
    "features": ["Feature 1", "Feature 2"]
  },
  "other": []
}
```

---

### 2) Create checkout session
**POST** `/parent/subscription/checkout`  
Auth: Parent bearer token

Request body:
```json
{
  "planKey": "monthly",
  "successUrl": "https://app.rydlearning.com/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://app.rydlearning.com/dashboard?subscription=cancelled"
}
```

Success `data` example:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

Validation errors:
- `planKey` required
- `successUrl` required, must be valid `http/https` URL
- `cancelUrl` required, must be valid `http/https` URL

Common failure example:
```json
{
  "message": "Stripe price not configured for this plan (NGN). Set stripePriceIdNgn / stripePriceIdUsd on the plan in admin or DB.",
  "status": false,
  "data": null
}
```

---

### 3) Get subscription status
**GET** `/parent/subscription/status`  
Auth: Parent bearer token

Success `data` example:
```json
{
  "subscribed": true,
  "subscriptions": [
    {
      "id": 14,
      "parentId": 2201,
      "status": "active",
      "planKey": "monthly",
      "currentPeriodEnd": "2026-05-20T10:43:17.000Z"
    }
  ]
}
```

---

### 4) Get subscription history
**GET** `/parent/subscription/history`  
Auth: Parent bearer token

Success `data` example:
```json
[
  {
    "id": 14,
    "status": "active",
    "planKey": "monthly",
    "billingCurrency": "NGN",
    "currentPeriodStart": "2026-04-20T10:43:17.000Z",
    "currentPeriodEnd": "2026-05-20T10:43:17.000Z",
    "cancelAtPeriodEnd": false,
    "updatedAt": "2026-04-20T10:43:20.000Z",
    "plan": {
      "key": "monthly",
      "name": "Monthly",
      "priceLabel": "₦5,000",
      "billingCurrency": "NGN",
      "amountNgn": 5000
    }
  }
]
```

