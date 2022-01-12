import { Injectable } from '@nestjs/common';
import { response } from 'express';
const request = require('request-promise');
const sha1 = require('sha1');
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  async getSlat(username, password) {
    const url = 'https://jw.ahnu.edu.cn/student/login-salt';
    let cookie = '';
    let data;
    await request(url, {
      method: 'GET',
      dataType: 'text',
      followRedirect: true,
      rejectUnauthorized: false,
      transform: (body, response) => {
        cookie = response.headers['set-cookie'];
        return body;
      },
    }).then((res) => {
      console.log(res);
      let sessionStr = cookie[1];
      sessionStr = sessionStr.split(';')[0].split('=')[1];
      console.log(username, password);
      const ePassword = sha1(res + '-' + password);
      data = {
        password: ePassword,
        session: sessionStr,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36',
          'Content-Type': 'application/json',
          Cookie: 'SESSION=' + sessionStr,
        },
      };
    });
    return data;
  }
  async login(body: any) {
    const url = 'https://jw.ahnu.edu.cn/student/login';
    const saltdata = await this.getSlat(body.username, body.password);
    const postdata = {
      username: body.username,
      password: saltdata.password,
      captcha: body.captcha || null,
      terminal: body.terminal || 'student',
    };
    console.log(postdata, saltdata);
    let pstsidStr;
    for (let i = 0; i < 10; i++) {
      let res = await request(url, {
        method: 'POST',
        body: JSON.stringify(postdata),
        headers: saltdata.headers,
        dataType: 'json',
        contentType: 'json',
        followRedirect: true,
        rejectUnauthorized: false,
        transform: (body, response) => {
          pstsidStr = response.headers['set-cookie'][0]
            .split(';')[0]
            .split('=')[1];
          return JSON.parse(body);
        },
      });
      console.log(res, typeof res);
      // pstsidStr = res.headers["set-cookie"][0].split(";")[0].split("=")[1]

      if (res.result) {
        const url = 'https://jw.ahnu.edu.cn/student/for-std/grade/sheet/';
        const headers = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36',
          'Content-Type': 'application/json',
          Cookie: `__pstsid__=${pstsidStr};SESSION=${saltdata.session}`,
          Connection: 'keep-alive',
        };
        var location, data;
        try {
          data = await request(url, {
            method: 'GET',
            headers,
            followRedirect: false,
            rejectUnauthorized: false,
            transform: (body, response) => {
              location = response.headers.location;
              // response.statusCode=0
              data = response;
              return response;
            },
          });

          // return data
        } catch (error) {
          // console.log(error)
        }
        // console.log(data);
        // return data;
        let arr = data.body.match(/([0-9]+)\S+查看详情/g) || [];
        if (arr.length == 2) {
          arr = arr.map((item) => {
            const hosturl =
              'https://jw.ahnu.edu.cn/student/for-std/grade/sheet/info/';

            return hosturl + item.match(/([0-9]+)/g)[0];
          });
          console.log(arr);
        } else {
          console.log(res.headers);
          arr = [location.replace('semester-index', 'info')];
        }
        const arr2 = ['主修成绩单', '辅修成绩单'];
        for (let j = 0; j < arr.length; j++) {
          try {
            res = await request(arr[j], {
              method: 'GET',
              headers: {
                'User-Agent': 'Apipost client Runtime/+https://www.apipost.cn/',
                Cookie: `__pstsid__=${pstsidStr};SESSION=${saltdata.session}`,
              },
              dataType: 'json',
              timeout: 10000,
              // followRedirect: false,
              rejectUnauthorized: false,
            });
          } catch (e) {
            console.log(e);
            return {
              code: -1,
              msg: '获取成绩单时发生错误',
            };
          }

          console.log(res);
          res = JSON.parse(res);
          const gradeSheetObj = res.semesterId2studentGrades;
          for (const s in gradeSheetObj) {
            gradeSheetObj[s] = gradeSheetObj[s].map((item) => {
              return {
                nameZh: item.course.nameZh,
                gradeDetail: item.gradeDetail,
                gaGrade: item.gaGrade,
                passed: item.passed,
              };
            });
          }
          return {
            code: 0,
            msg: '获取成功',
            data: gradeSheetObj,
          };
        }
      } else {
        console.log(i);
      }
    }
  }
}
