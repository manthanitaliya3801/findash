const http = require('http');

const data = JSON.stringify({
    title: 'Test Expense',
    amount: 100,
    category: 'Test',
    description: 'Test Description',
    date: '2026-02-08'
});

const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/v1/add-expense',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        // Note: We are NOT sending an Authorization header here to see how it behaves, 
        // or we can simulate it if we had a token. 
        // If the error is 500 instead of 401 without token, that's a clue.
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
