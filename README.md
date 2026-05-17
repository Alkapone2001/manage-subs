# Telegram Subscription Manager

A minimal platform to manage Telegram crypto signal group subscriptions with customer registration, plan selection, dashboard notifications, and email alerts for subscriptions ending soon.

## Features

- Client registration with:
  - First name
  - Last name
  - Birthday
  - Discord tag
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

If you want clients to subscribe for any number of months, enter the desired month count in the dashboard form.

3. Start the app:

```bash
npm start
```

4. Open the browser at `http://localhost:3000`.

## Usage

- Add new subscriptions from the web form.
- See expiring subscriptions in the notification center.
- Emails are sent automatically when a subscription expires within the configured notification window.

## Notes

- `subscriptions.db` is created automatically in the project root.
- Change the notification window using `NOTIFICATION_WINDOW_DAYS` if needed.
