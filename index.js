const axios = require('axios');
const https = require('https');
const Discord = require('discord-webhook-node');
const moment = require('moment');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const agent = new https.Agent({ rejectUnauthorized: false });

const loginUrl = 'https://110129.samanpl.ir/Account/Login';
const apiUrls = [
  'https://110129.samanpl.ir/Common/Portal/ReservesLibraryNew/?Id=[]&date={date}&SHour=8&THour=11&userId=[]',
  'https://110129.samanpl.ir/Common/Portal/ReservesLibraryNew/?Id=[]&date={date}&SHour=11&THour=14&userId=[]',
  'https://110129.samanpl.ir/Common/Portal/ReservesLibraryNew/?Id=[]&date={date}&SHour=14&THour=17&userId=[]',
  'https://110129.samanpl.ir/Common/Portal/ReservesLibraryNew/?Id=[]&date={date}&SHour=17&THour=20&userId=[]',
  //'https://110129.samanpl.ir/Common/Portal/ReservesLibraryNew/?Id=[]&date={date}&SHour=20&THour=21&userId=[]'
];

const userName = '-';
const password = '-';

let retryCount = 0; 

const successfulUrls = new Set(); 

async function startLoginAndGetCookies() {
  await loginAndGetCookies();
  setInterval(loginAndGetCookies, 60000); 
}

setInterval(startLoginAndGetCookies, 1000);

async function loginAndGetCookies() {
  const loginData = {
    returnUrl: '%2FHome%2FReserveDetail',
    UserName: userName,
    Password: password,
  };

  try {
    const loginResponse = await axios.post(loginUrl, loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (loginResponse.status === 302 && loginResponse.headers['set-cookie']) {
      const cookies = loginResponse.headers['set-cookie'].join('; ');

      const headers = {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9,fa;q=0.8',
        'content-type': 'application/json',
        'sec-ch-ua': '"Not/A)Brand";v="99", "Microsoft Edge";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': 'Windows',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        'xsrf-token': 'xsrf-token',
        referer: 'https://110129.samanpl.ir/Home/ReserveDetail',
        'referrer-policy': 'same-origin',
        cookie: cookies,
      };

      for (const apiUrl of apiUrls) {
        if (successfulUrls.has(apiUrl)) {
          continue;
        }

        const currentDate = moment().add(1, 'days').format('M/D/YYYY');
        const formattedApiUrl = apiUrl.replace('{date}', currentDate);

        const bodyData = {
          returnUrl: '%2FHome%2FReserveDetail',
          UserName: userName,
          Password: password,
        };

        const response = await axios.post(formattedApiUrl, bodyData, { headers, httpsAgent: agent });

        if (response.data.Success === false) {
          retryCount++;
          continue;
        } 
        else if (response.data.Success === true) {
          successfulUrls.add(apiUrl); 
          const webhook = new Discord.Webhook('YOUR-DISCORDWEBHOOK');
          
          const startTime = apiUrl.match(/SHour=(\d+)/);
          const endTime = apiUrl.match(/THour=(\d+)/);
          const startHour = startTime ? parseInt(startTime[1]) : 0;
          const endHour = endTime ? parseInt(endTime[1]) : 0;

          const embed = new Discord.MessageBuilder()
            .setTitle(`✅ Reservation Date: ${currentDate} | ${startHour} - ${endHour}`)
            .setDescription('The reservation was successful.')
            .setColor('#00FF00')
            .addField('🗨️ Message', response.data.Message);
            
          webhook.send(embed);
          break;
        }
      }

      if (successfulUrls.size === apiUrls.length) {
        console.log('All links have been checked and they are successful.');
      }
    } else {
      console.log('Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
