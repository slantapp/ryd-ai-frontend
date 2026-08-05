# Contact Message Widget — AI App Frontend Handoff

Integrate a **bottom-right “Send us a message” widget** in the AI Tutor app (`ai.rydlearning.com`), similar to the chat/message launcher on the marketing landing page.

This uses RYD’s own contact API. Messages are emailed to **learning@rydlearning.com**. No JWT / auth header required.

---

## Goal (UX)

1. Fixed floating button (bottom-right) on AI app pages.
2. Click opens a small panel/modal with a contact form.
3. On submit → call the API below.
4. Show success / error from the API `message` field.
5. Optional: when the parent is logged in, prefill **name** and **email** from their session/profile (still allow edit).

Suggested subject default: `AI Tutor Support` (user can change).

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Production  | `https://api-pro.rydlearning.com` |
| Local API   | `http://localhost:3000` (or whatever the API runs on) |

CORS already allows `https://ai.rydlearning.com` and common localhost ports.

---

## Endpoint

```
POST /common/contact/send-message
Content-Type: application/json
```

**Auth:** none (public)

**Full URL (prod):**  
`https://api-pro.rydlearning.com/common/contact/send-message`

### Request body

| Field     | Type   | Required | Validation |
|-----------|--------|----------|------------|
| `name`    | string | yes      | trim, min **2**, max **200** |
| `email`   | string | yes      | valid email, max **320** |
| `subject` | string | yes      | trim, min **2**, max **300** |
| `message` | string | yes      | trim, min **10**, max **10000** |

### Example request

```http
POST /common/contact/send-message HTTP/1.1
Host: api-pro.rydlearning.com
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "AI Tutor Support",
  "message": "My child cannot access lesson 3 after payment. Please help."
}
```

### Example — `fetch`

```js
async function sendContactMessage({ name, email, subject, message }) {
  const res = await fetch(
    "https://api-pro.rydlearning.com/common/contact/send-message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    }
  );

  const json = await res.json();
  // Always check json.status (boolean), not only HTTP status
  if (!res.ok || json.status !== true) {
    throw new Error(json.message || "Could not send message");
  }
  return json; // { message, status: true, data: [] }
}
```

### Example — `axios`

```js
import axios from "axios";

const { data } = await axios.post(
  "https://api-pro.rydlearning.com/common/contact/send-message",
  { name, email, subject, message }
);

if (data.status !== true) {
  throw new Error(data.message || "Could not send message");
}
```

---

## Response format

All responses use:

```ts
{
  message: string;  // human-readable; show this in the UI
  status: boolean;  // true = success, false = failure
  data: unknown;    // usually [] on success
}
```

### Success (`200`)

```json
{
  "message": "Your message was sent. We will get back to you at jane@example.com.",
  "status": true,
  "data": []
}
```

### Validation error (`400`)

Typical when a field fails Joi rules (missing, too short, invalid email, etc.).

```json
{
  "message": "<validation error text>",
  "status": false,
  "data": null
}
```

Frontend tips:
- Enforce the same min lengths client-side before submit (especially `message` ≥ 10).
- Display `message` from the response as the error toast/text.

### Email delivery failure (`502`)

Returned when validation passed but the mailer failed:

```json
{
  "message": "We couldn't send your message right now. Please try again shortly, or email us directly at learning@rydlearning.com.",
  "status": false,
  "data": null
}
```

Show that text and optionally a fallback mailto: `learning@rydlearning.com`.

---

## Form fields (recommended UI)

| UI label | Maps to | Notes |
|----------|---------|--------|
| Full name | `name` | Prefill from parent `firstName` + `lastName` if available |
| Email | `email` | Prefill from parent email; required for reply |
| Subject | `subject` | Default `"AI Tutor Support"` |
| Message | `message` | Textarea; min 10 chars |

States to handle:
- Idle / open / submitting / success / error
- Disable submit while submitting
- On success: clear message (keep name/email), show success copy, optionally auto-close after a few seconds

---

## What happens on the backend

1. Validates body.
2. Emails **learning@rydlearning.com** with name, email, subject, message, and submit time.
3. Staff reply manually using the email in the body (Reply-To stays the system inbox).

No DB record is created for this message today.

---

## Related (optional) endpoint

If you also need a “request a course” form later:

```
POST /common/contact/request-course
```

Body:

| Field           | Required | Rules |
|-----------------|----------|--------|
| `name`          | yes      | min 2, max 200 |
| `courseRequest` | yes      | min 2, max 300 |
| `description`   | no       | max 8000, can be `""` |

Same response shape (`message` / `status` / `data`).

---

## Alternative: Tawk.to live chat (same as landing)

The marketing landing currently embeds **Tawk.to** as the bottom-right launcher (not the contact API).

If product wants the **exact same live chat** instead of (or in addition to) the form:

```html
<script type="text/javascript">
  var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
  (function () {
    var s1 = document.createElement("script"),
      s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/6696904abecc2fed69261bff/1i2u279kq";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode.insertBefore(s1, s0);
  })();
</script>
```

- Property / widget: `6696904abecc2fed69261bff` / `1i2u279kq`
- Prefer the **API form** if you want messages to hit `learning@rydlearning.com` through our mailer and stay in-product.

---

## Frontend checklist

- [ ] Floating button fixed bottom-right (`z-index` high enough over AI UI)
- [ ] Form validates name / email / subject / message before POST
- [ ] `POST https://api-pro.rydlearning.com/common/contact/send-message`
- [ ] Treat success only when `status === true`
- [ ] Surface API `message` on success and failure
- [ ] Prefill name + email for logged-in parents
- [ ] Loading + disabled submit while request in flight
- [ ] Works on mobile (panel doesn’t cover inputs / keyboard)

---

## Quick curl test

```bash
curl -s -X POST 'https://api-pro.rydlearning.com/common/contact/send-message' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Parent",
    "email": "test@example.com",
    "subject": "AI Tutor Support",
    "message": "This is a test message from the AI app handoff."
  }'
```

Expect: `"status": true` and an email at learning@rydlearning.com.

---

## Contact

Backend owner / API: `ryd-learning-api-v2`  
Route: `routes/route.common.js` → `POST /contact/send-message`  
Controller: `controllers/controller.common.js` → `commonSendContactMessage`
