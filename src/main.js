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

    //testCrawlDepth(baseUrl, 2); //much unstable
	if (!baseUrl) {
		console.log('Error: no url given');
	} else {
    	testCrawl();
	}

} init();


function testCrawlDepth(url, maxDepth){
    let types = {
        a: ['href'],
        img: ['src'],
        title: ['innerHTML']
    };

    try{
        crawl.crawlWithDepth(url, types, maxDepth, (data) => {
            console.log('calback reached');
            console.log(JSON.stringify(data, null, 4));
            crawl.saveJSON("temp.json", data, true);
        });
    } catch(e){
        console.log('error ', e);
    }
}

function testCrawl(){
    let types = {
        h1: ['innerHTML'],
        h2: ['innerHTML'],
        h3: ['innerHTML'],
        p: ['innerHTML'],
        a: ['href', 'innerHTML'],
        img: ['src'],
        script: ['src'],
        link: ['rel', 'href']
    };

    console.log(process.argv);
    // return;
    //baseUrl = 'http://chrozera.xyz/';
    if (process.argv.length > 2 && process.argv[2]){
        baseUrl = process.argv[2];
        console.log('abab');
    }
    console.log(baseUrl, process.argv.length)

    crawl.crawlUrl(baseUrl, types, function(data) {
        console.log('Got Data.');
        crawl.saveJSON('temp.json', data, true);
    });
}


