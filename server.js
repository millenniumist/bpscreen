const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const path = require('path');
const app = express();
const port = process.env.NODE_PORT || 3000;
const enabledLEDMatrix = process.env.APP_ENABLED_LED_METRIX || false;
const serialPortFile = process.env.APP_SERIAL_PORT_FILE || "/dev/ttyUSB0";
const TIMEZONE_OFFSET_HOURS = 7;
let persistedData = {};
let viewMode = "CLOCK"
let clockInterval;

morgan.token('decodedUrl', (req) => decodeURIComponent(req.originalUrl));
morgan.token('date', () => {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() + TIMEZONE_OFFSET_HOURS);

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth() returns 0-11
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');
    const second = String(now.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
});

const accessLogStream = rfs.createStream('access.log', {
    size: '10M', // rotate every 10 MegaBytes written
    interval: '1d', // rotate daily
    compress: 'gzip', // compress rotated files
    path: path.join(__dirname, 'log') // log directory
});

app.set('view engine', 'ejs');
app.use(morgan('[:date] :method :decodedUrl :status :response-time ms', { stream: accessLogStream }));

const configureSerialPort = () => {
    exec(`stty -F ${serialPortFile} speed 9600 cs8 -cstopb -parenb raw`, (execErr) => {
        if (execErr) {
            console.error(`Failed to configure /dev/ttyUSB0: ${execErr.message}`)
        } else {
            console.log('/dev/ttyUSB0 is available and configured.')
        }
    });
}

const checkSerialPort = (callback) => {
    fs.access(serialPortFile, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, (err) => {
        let isAvailable = false;
        let errorMessage = null;

        if (err) {
            if (err.code === 'ENOENT') {
                errorMessage = `Serial port ${serialPortFile} does not exist.`;
            } else if (err.code === 'EACCES') {
                errorMessage = `Serial port ${serialPortFile} is not accessible (no read/write permission).`;
            } else {
                errorMessage = `An error occurred while checking ${serialPortFile}: ${err.message}`;
            }
        } else {
            isAvailable = true;
        }

        callback(isAvailable, errorMessage);
    });
}

const displayToLEDMatrix = (message) => {
    // Check if /dev/ttyUSB* is accessible
    checkSerialPort((isAvailable, errorMessage) => {
        if (isAvailable) {
            // Proceed to write to the port if it is available
            exec(`echo "${message}" > ${serialPortFile}`, (execErr) => {
                if (execErr) {
                    console.error(`Execution error: ${execErr}`);
                }
            });
        } else {
            console.error(errorMessage);
        }
    });
};

const displayParkingFeeToLEDMatrix = (licensePlate, amount) => {
    const amountString = amount.toString();
    let spaces = '';

    // Determine the number of spaces based on the length of the amount
    switch (amountString.length) {
        case 4: // xxxx
            spaces = ' ';
            break;
        case 3: // xxx
            spaces = '  ';
            break;
        case 2: // xx
            spaces = '   ';
            break;
    }

    // Format the amount string with spaces
    const amountWithFraction = amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const formattedAmount = `฿${spaces}${amountWithFraction}`;
    const message = `${licensePlate},${formattedAmount}`

    displayToLEDMatrix(message)
}

const updateClock = () => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000; // Convert to UTC
    const bangkokTime = new Date(utcTime + (3600000 * 7)); // UTC + 7 hours for Bangkok

    const hours = String(bangkokTime.getHours()).padStart(2, '0');
    const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');
    const message = ` ${hours}:${minutes}`;

    displayToLEDMatrix(message)
}

const startDisplayClockToLEDMatrix = () => {
    if (!clockInterval) {
        updateClock();
        clockInterval = setInterval(updateClock, 1000);
    }
};

const stopDisplayClockToLEDMatrix = () => {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
};

app.get('/', (req, res) => {
    const plateLetter = req.query['plateLetter'] || "";
    const plateNumber = req.query['plateNumber'] || "";
    const plateProvince = req.query['plateProvince'] || "";
    const amount = req.query['amount'] || "0.0";
    const isPlateInfoComplete = plateLetter && plateNumber && plateProvince;

    if (enabledLEDMatrix) {

    } else {
        res.render('index', {
            displayPlateLine1: isPlateInfoComplete ? `${plateLetter} - ${plateNumber}` : "",
            displayPlateLine2: plateProvince,
            displayFeeLine1: isPlateInfoComplete ? amount : "0.0"
        });
    }
});

app.get('/plateInfo', (req, res) => {
    viewMode = "PLATE"
    persistedData = {
        plateLetter: req.query['plateLetter'] || "",
        plateNumber: req.query['plateNumber'] || "",
        plateProvince: req.query['plateProvince'] || ""
    };

    if (enabledLEDMatrix) {
        const message = `${persistedData.plateLetter}-${persistedData.plateNumber}`
        stopDisplayClockToLEDMatrix();
        displayToLEDMatrix(message)
    }

    res.status(204).end();
});

app.get('/charges', (req, res) => {
    viewMode = "CHARGE"
    persistedData = {
        plateLetter: req.query['plateLetter'] || "",
        plateNumber: req.query['plateNumber'] || "",
        plateProvince: req.query['plateProvince'] || "",
        amount: req.query['amount'] || "0.0"
    };

    if (enabledLEDMatrix) {
        const licensePlate = `${persistedData.plateLetter}-${persistedData.plateNumber}`
        stopDisplayClockToLEDMatrix();
        displayParkingFeeToLEDMatrix(licensePlate, persistedData.amount)
    }

    res.status(204).end();
});

app.get('/clock', (req, res) => {
    viewMode = "CLOCK";
    persistedData = {};

    if (enabledLEDMatrix) {
        startDisplayClockToLEDMatrix();
    }

    res.status(204).end();
});

app.get('/thankyou', (req, res) => {
    viewMode = "THANK_YOU"
    persistedData = {};

    if (enabledLEDMatrix) {
        stopDisplayClockToLEDMatrix();
        displayToLEDMatrix("ขอบคุณที่ใช้บริการ")
    }

    res.status(204).end();
});

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = () => {
        persistedData.viewMode = viewMode;

        res.write(`data: ${JSON.stringify(persistedData)}\n\n`);
    };

    sendUpdate();

    const intervalId = setInterval(sendUpdate, 1000);

    req.on('close', () => {
        clearInterval(intervalId);
    });
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);

    checkSerialPort((isAvailable, errorMessage) => {
        if (isAvailable) {
            console.log('/dev/ttyUSB0 is available.');
            configureSerialPort();
            stopDisplayClockToLEDMatrix();
        } else {
            console.error(errorMessage);
        }
    });
});

// Capture shutdown signal
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});