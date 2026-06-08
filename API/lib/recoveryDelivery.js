async function deliverRecoveryToken(email, resetToken) {
    if (process.env.PASSWORD_RECOVERY_WEBHOOK_URL) {
        const webhookURL = new URL(process.env.PASSWORD_RECOVERY_WEBHOOK_URL);
        if (webhookURL.protocol !== 'https:') {
            throw new Error('PASSWORD_RECOVERY_WEBHOOK_URL must use https.');
        }

        await fetch(webhookURL.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'password-recovery',
                email: email,
                resetToken: resetToken
            })
        });
        return { mode: 'webhook' };
    }

    return { mode: 'queued' };
}

module.exports = {
    deliverRecoveryToken
};
