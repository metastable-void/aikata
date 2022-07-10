/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */

/**
 * Cron this file at 0800-0900 every morning JST
 * @file
 */

import 'dotenv/config';
import process from 'node:process';
import { parse } from 'node-html-parser';
import 'isomorphic-fetch';
import nodemailer from 'nodemailer';

const BASE_URL = 'https://www.jcp.or.jp/akahata/';
const sleep = (ms) => new Promise((res) => setTimeout(() => res(), ms));

(async () => {
  //
  const res = await fetch(BASE_URL);
  const root = parse(await res.text());
  const links = root.querySelectorAll('.mokuji_list li.newslist a');
  const date = root.querySelector('.mokuji_list .css5');
  const dateText = date.textContent.trim();
  let html = date ? date.outerHTML : '';
  for (const link of links) {
    const href = (new URL(link.getAttribute('href'), BASE_URL)).href;
    await sleep(1000);
    const res = await fetch(href);
    const root = parse(await res.text());
    const content = root.querySelector('#content_L1');
    if (!content) {
      continue;
    }
    try {
      content.querySelector('.digitalprbana').remove();
      content.querySelector('.socialbtnBox').remove();
    } catch (e) {
      console.error(e);
    }

    try {
      for (const script of content.querySelectorAll('script')) {
        script.remove();
      }
    } catch (e) {
      console.error(e);
    }

    try {
      for (const img of content.querySelectorAll('img')) {
        const src = img.getAttribute('src');
        const imgLink = new URL(src, href).href;
        await sleep(1000);
        const res = await fetch(imgLink);
        const type = res.headers.get('content-type');
        const buf = Buffer.from(await res.arrayBuffer());
        const base64 = buf.toString('base64');
        img.setAttribute('src', `data:${type};base64,${base64}`);
      }
    } catch (e) {
      console.error(e);
    }
    
    const contentHtml = content.innerHTML.replace(/^\s*\r?\n/gm, '');
    html += `<hr>\n<a href="${href}">${href}</a>\n${contentHtml}\n`;
  }
  const message = {
    to: process.env.MAIL_TO,
    from: process.env.MAIL_FROM,
    subject: `[Aikata] ${dateText}`,
    html,
    attachDataUrls: true,
  };
  const transporter = nodemailer.createTransport(process.env.MAIL_TRANSPORT);
  transporter.sendMail(message, (err, info) => {
    console.log('Error:', err);
    console.log('Info:', info);
  });
})();
