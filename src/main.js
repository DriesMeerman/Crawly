#!/usr/bin/env node
const crawl = require("./Crawly.js");
const EventEmitter = require('events');

class CrawlEmitter extends EventEmitter {}
const crawlEmitter = new CrawlEmitter();

let baseUrl = "";

function init(){
    if (process.argv.length > 2 && process.argv[2]){
        baseUrl = process.argv[2];
    }

    testCrawlDepth(baseUrl, 2);

    // testCrawl();
} init();


function testCrawlDepth(url, maxDepth){
    let types = {
        a: ['href'],
        img: ['src']
    };
    crawl.crawlWithDepth(url, types, maxDepth, null, null, (data) => {
        console.log('calback reached');
        console.log(JSON.stringify(data, null, 4));
        crawl.saveJSON("temp.json", data, true);
    });
}

function testCrawl(){
    let types = {
        h1: ['innerHTML'],
        a: ['href', 'innerHTML'],
        img: ['src'],
        script: ['src'],
        link: ['rel', 'href']
    };

    console.log(process.argv);
    // return;
    baseUrl = 'http://chrozera.xyz/';
    if (process.argv.length > 2 && process.argv[2]){
        baseUrl = process.argv[2];
        console.log('abab');
    }
    console.log(baseUrl, process.argv.length)

    crawl.crawlUrl(baseUrl, types, function(data) {
        console.log('Got Data.');
        crawlEmitter.emit('gotData', data);
    });
}

crawlEmitter.on('gotData', (data) => {
   console.log(data);
   //crawl.saveJSON('nos_data.json', data, true);
});

