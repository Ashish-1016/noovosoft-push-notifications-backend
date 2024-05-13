const express = require('express');
const app = express();
const cors = require("cors")
const {google} = require("googleapis")

// Middleware to parse JSON request body
app.use(express.json());
app.use(cors())

function getServerToken() {
    const key = require("./private.json")
    return new Promise((resolve, reject) => {
        const jwtClient = new google.auth.JWT(
            key.client_email,
            undefined,
            key.private_key,
            ["https://www.googleapis.com/auth/firebase.messaging"],
            undefined
        );
        jwtClient.authorize((err, tokens) => {
            if (err || !tokens) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

// Middleware to check for registration token in headers
const checkRegistrationToken = (req, res, next) => {
    const registrationToken = req.headers.registrationtoken;
    if (!registrationToken) {
        return res.status(400).json({error: 'No registration token provided'});
    }
    next();
};

app.get("/", async (req, res) => {
    res.send("Hello from vercel")
})

app.post('/send-notification', checkRegistrationToken, async (req, res) => {
    const {title, body, delay = 0} = req.body;
    const registrationToken = req.headers.registrationtoken;

    try {
        const serverToken = await getServerToken();
        if (!serverToken) {
            return res.status(500).json({error: 'Failed to generate server token'});
        }

        if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        const payload = JSON.stringify({
            message: {
                token: registrationToken,
                notification: {title,  body},
            },
        });

        const response = await fetch(
            'https://fcm.googleapis.com/v1/projects/noovosoft-push-messages/messages:send',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${serverToken}`,
                },
                body: payload,
            }
        );

        const data = await response.json();
        if (response.ok) {
            return res.status(200).json({message: 'Notification sent successfully', data});
        } else {
            return res.status(500).json({error: 'Failed to send notification', data});
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({error: 'Internal server error'});
    }
});

app.listen(() => {
    console.log('Vercel server is running');
});

module.exports = app
