const cookie = require('cookie');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'POST') {
    const data = JSON.parse(event.body);
    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': cookie.serialize('countdownData', encodedData, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 365 // 1 year
        }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Cookie set successfully' })
    };
  } else if (event.httpMethod === 'GET') {
    const cookies = cookie.parse(event.headers.cookie || '');
    if (cookies.countdownData) {
      const decodedData = Buffer.from(cookies.countdownData, 'base64').toString('utf8');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: decodedData
      };
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'No data found' })
      };
    }
  } else {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }
};
