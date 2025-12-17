
import https from 'https';

const agent = new https.Agent({
    rejectUnauthorized: false
});

https.get('https://localhost:5173/index.html', { agent }, (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);
    res.on('data', (d) => {
        // console.log(d.toString()); 
    });
}).on('error', (e) => {
    console.error(e);
});
