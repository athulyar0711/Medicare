const webpush = require('web-push');
const pool = require('./config/db');

// Set VAPID keys
webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function checkAndSendReminders() {
    try {
        // Find due active reminders
        const [reminders] = await pool.query(`
            SELECT * FROM reminders 
            WHERE is_active = TRUE AND next_trigger <= NOW()
        `);

        if (reminders.length === 0) return;

        for (const reminder of reminders) {
            // Find push subscriptions for this user
            const [subscriptions] = await pool.query(
                'SELECT * FROM push_subscriptions WHERE user_id = ?',
                [reminder.user_id]
            );

            const payload = JSON.stringify({
                title: reminder.title || 'Medicare Reminder',
                body: reminder.description || `It's time for your scheduled reminder: ${reminder.title}`,
            });

            for (const sub of subscriptions) {
                const pushSub = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                try {
                    console.log(`Attempting to push to user ${reminder.user_id}... payload:`, payload);
                    await webpush.sendNotification(pushSub, payload);
                    console.log(`✅ Successfully pushed notification for reminder ${reminder.id}`);
                } catch (err) {
                    console.error('❌ Failed to send push notification', err);
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription has expired or is no longer valid
                        await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                    }
                }
            }

            // Update reminder's next_trigger or disable if interval is 0 (one-time)
            if (reminder.interval_minutes > 0) {
                await pool.query(
                    'UPDATE reminders SET next_trigger = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
                    [reminder.interval_minutes, reminder.id]
                );
            } else {
                await pool.query('UPDATE reminders SET is_active = FALSE WHERE id = ?', [reminder.id]);
            }
        }
    } catch (err) {
        console.error('Error in checkAndSendReminders job:', err);
    }
}

// Start polling every minute
function startPushScheduler() {
    console.log('Push scheduler started (checking every minute)');
    setInterval(checkAndSendReminders, 60 * 1000); // Check every 60 seconds
}

module.exports = startPushScheduler;
