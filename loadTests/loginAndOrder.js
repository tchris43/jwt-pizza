import { sleep, check, group, fail } from 'k6'
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },
        { target: 15, duration: '1m' },
        { target: 10, duration: '30s' },
        { target: 0, duration: '30s' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
  },
}



export function scenario_1() {
  let response

  const vars = {};

  // login
  response = http.put('https://pizza-service.nextevent.click/api/auth', '{"email":"d@jwt.com","password":"diner"}', {
  headers: {
    'content-type': 'application/json', // <--- Add this line!
    'accept': '*/*',
    'origin': 'https://pizza.byucsstudent.click',
  },
});
  check(response, { 'status equals 200': (response) => response.status.toString() === '200' });

  if (!check(response, { 'status equals 200': (response) => response.status.toString() === '200' })) {
  console.log(response.body);
  fail('Login was *not* 200');
  }

  // Store the token from the response
  vars['token'] = response.json().token;

  console.log('Captured Token: ' + vars.authToken);

  sleep(6.6)

  // Get menu
  response = http.get('https://pizza-service.nextevent.click/api/order/menu', {
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${vars['token']}`, // Ensure this matches your login variable!
      'accept': '*/*',
    },
  })

  // Get franchise
  response = http.get('https://pizza-service.nextevent.click/api/franchise?page=0&limit=20&name=*', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9,ja-JP;q=0.8,ja;q=0.7',
      authorization: `Bearer ${vars['token']}`,
      'content-type': 'application/json',
      'if-none-match': 'W/"6d-6sC2JMLW6c5Beaw/5xt5PuwrHDc"',
      origin: 'https://pizza.nextevent.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-storage-access': 'active',
    },
  })
  sleep(9.8)

  // Get User Info
  response = http.get('https://pizza-service.nextevent.click/api/user/me', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9,ja-JP;q=0.8,ja;q=0.7',
      authorization: `Bearer ${vars['token']}`,
      'content-type': 'application/json',
      'if-none-match': 'W/"5d-34BjlHBkgFCq6b0Qh3a4kVEdLok"',
      origin: 'https://pizza.nextevent.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-storage-access': 'active',
    },
  })
  sleep(5.3)

  // Order Pizza
  response = http.post(
    'https://pizza-service.nextevent.click/api/order',
    '{"items":[{"menuId":2,"description":"Pepperoni","price":0.0042}],"storeId":"3","franchiseId":1}',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9,ja-JP;q=0.8,ja;q=0.7',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        origin: 'https://pizza.nextevent.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-storage-access': 'active',
      },
    }
  )
  sleep(1.9)

  // Verify pizza
  response = http.post(
    'https://pizza-factory.cs329.click/api/order/verify',
    '{"jwt":"eyJpYXQiOjE3OTU0NjgzMDUsImV4cCI6MTc5NTU1NDcwNSwiaXNzIjoiY3MzMjkuY2xpY2siLCJhbGciOiJSUzI1NiIsImtpZCI6Ik9TcF94VzhlM3kwNk1KS3ZIeW9sRFZMaXZXX2hnTWxhcFZSUVFQVndiY0UifQ.eyJ2ZW5kb3IiOnsiaWQiOiJsc2o3IiwibmFtZSI6IkxlZSBKZW5zZW4ifSwiZGluZXIiOnsiaWQiOjExMCwibmFtZSI6IlRlc3QiLCJlbWFpbCI6InRlc3RAZ21haWwuY29tIn0sIm9yZGVyIjp7Iml0ZW1zIjpbeyJtZW51SWQiOjIsImRlc2NyaXB0aW9uIjoiUGVwcGVyb25pIiwicHJpY2UiOjAuMDA0Mn1dLCJzdG9yZUlkIjoiMyIsImZyYW5jaGlzZUlkIjoxLCJpZCI6MTc1fX0.YlMbnLdKACTvKkGrxzjxmRd7zPnAsRoq3HbLNbFILQsutX3G6-0C5blZgYRGmBFgwCuY0y5PJvQ2QTwj8Eh4DJeMR8R0l4Yo-XPmQRrR33ml85MOEbwNRftO2Kn4dOBhj8l23kg-r_NZuJL0zhzmP5O_XCSwjRVFH0C4L-LeZRGlXG5EeGD1K8ZKbuQ5B2sr6ggO_J_upmCrLBz5SqhSmyW5CXKfjRI9E_xazQpXy4pHEZjMufh5czxoU9d4mkjT58YasoTWMswD0PI1ieeKBs1cJsRsEiw8bx1QEMiD_5sVVSlcI5kcDZnJqDL2lEufrhVqKtogtTWapZy8YFATOEEYDSHmT1ZwBRCVKSipJlgQitF4Q4kAFggtESZgnD22YtPA5bAO2rvc152AcpT36eZHj1G-YUZ8DO8WY8a8HQGsxNAzW0la6-y3shm595R_bY5Kywegx9NgqkEJKuqTw0sqSAI60KrpI_MJkaGitZWUaRFv1SQnbQZpLyRlhI4cUjp4AdXZdryLa-Q_zCO7-jOpSBadXQB8OFLQS--bG9slzQayjG8RIiBSTqVP3cDsr-ljyD7znzjEAhqYuoKRhs2TC3ORNwEAiJH4WpLO1VMpWpyzVacXAtp27x4IhiEdGkVHxDnQXP4k8PhZWeo7fnLIcbaMNxoPXKv3VG9BZiQ"}',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9,ja-JP;q=0.8,ja;q=0.7',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        origin: 'https://pizza.nextevent.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-storage-access': 'active',
      },
    }
  )
}
