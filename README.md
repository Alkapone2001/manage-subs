# Subscription Manager

A minimal platform to manage crypto signal group subscriptions with customer registration, plan selection, dashboard notifications, and email alerts for subscriptions ending soon.

## Features

- Client registration with:
  - First name
  - Last name
  - Birthday
  - Discord tag
  - Phone number
  - Email
  - Subscription length in months
- Dashboard notification center for expiring subscriptions
- Admin settings for notification email and alert window
- Delete clients and extend subscriptions from the dashboard
- Daily email summary if SMTP is configured
- SQLite storage for simplicity

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure email notifications with environment variables if desired:

```bash
export EMAIL_HOST=smtp.example.com
export EMAIL_PORT=587
export EMAIL_USER=your@email.com
export EMAIL_PASS=yourpassword
export EMAIL_FROM=your@email.com
export ADMIN_EMAIL=admin@yourdomain.com
export EMAIL_SECURE=false
export NOTIFICATION_WINDOW_DAYS=7
```

Use the dashboard settings panel to save the admin receiver email and notification window.
If you want clients to subscribe for any number of months, enter the desired month count in the dashboard form.

3. Start the app:

```bash
npm start
```

4. Open the browser at `http://localhost:3000`.

## SMTP / Email setup

To enable email notifications, set environment variables (create a `.env` file in the project root) or export them in your shell. Example `.env` values:

```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-smtp-password-or-app-password
EMAIL_SECURE=false
EMAIL_FROM=your-email@example.com
ADMIN_EMAIL=admin@yourdomain.com
SESSION_SECRET=some_long_random_value
```

If you use Gmail, create an App Password and use it as `EMAIL_PASS`.

There is a protected test endpoint you can call after logging in to verify SMTP:

1) Log in via the UI using the admin credentials (set `ADMIN_USER` / `ADMIN_PASS` if you changed them).
2) Use `curl` to authenticate and trigger a test email:

```bash
# 1) login and save cookies
curl -c cookies.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:3000/api/login

# 2) trigger test email
curl -b cookies.txt -X POST http://localhost:3000/api/test-email
```

The response will indicate success or an error message with details.

## Usage

- Add new subscriptions from the web form.
- See expiring subscriptions in the notification center.
- Emails are sent automatically when a subscription expires within the configured notification window.

## Notes

- `subscriptions.db` is created automatically in the project root.
- Change the notification window using `NOTIFICATION_WINDOW_DAYS` if needed.
