#!/usr/bin/env node
const htmlparser = require("htmlparser2");
const EventEmitter = require('events');
const urlUtil = require('url');
const fs = require('fs');

class CrawlEmitter extends EventEmitter {}
const crawlEmitter = new CrawlEmitter();

let urls = [];
let visited = {};
let currentTypes = {};
let callback = null;
let maxDepth = 0;
let crawledData = {};
let blockNewUrls = false;

crawlEmitter.on('crawledUrl', (result, depth) => {

    if (result !== -1){
        let tempUrls = [];

        if (result['a'] && result['a']['href']){

            tempUrls  = result['a']['href'].map(function (url){
                return {
                    url: url,
                    depth: depth
                };
            });

            tempUrls = tempUrls.filter(function (urlObj) {
                if (urlObj.depth < maxDepth && urlObj.url.indexOf(result.parent) === -1){
                    return urlObj;
                }
            });

            if (urls.length < 100 && !blockNewUrls){
                urls = urls.concat(tempUrls);
                if (urls.length > 100){
                    console.log(urls.length);
                    saveobjToFile('urls.json', urls, true);
                    blockNewUrls = true;
                }
            } else {
                console.log(urls.length);
                saveobjToFile('urls.json', urls, true);
                blockNewUrls = true;
            }

        }

        console.log('Got data ', urls.length, 'urls left.');
        let parent = result.parent;
        delete result.parent;
        // let data = {};
        // data[parent] = result;

        crawledData[parent] = result;
    }

    setTimeout(function(){
        if (urls.length > 0){
            let nextUrl = urls.shift();
            if (nextUrl.depth < maxDepth && nextUrl.url){

                crawlNext(nextUrl.url, nextUrl.depth + 1);
            } else {
                crawlEmitter.emit('crawledUrl', -1);
            }
        } else {
            callback(crawledData);
        }

    },1000);
});

function crawlWithDepth(url, types, depth, call){

    callback = call;
    maxDepth = depth;


    types = types ? types : {};
    if (!types['a'] || !types['a'].includes('href')){
        types['a'] = types['a'] ? types['a'] : [];
        types['a'].push('href');
    }

    currentTypes = types;

    // urls.push({
    //    url: url,
    //    depth: 0
    // });


    crawlNext(url, 0);
    //crawlEmitter.emit('crawledUrl', -1, depth);

    setTimeout(function(){
        saveobjToFile('urls.json', urls, true);
    }, 10000)
}

function crawlNext(url, depth){
    if (!visited[url] && !url.startsWith('#') ){
        console.log('Visiting: ', url);

        crawl(url, currentTypes, (data)=>{
            visited[url] = 1;
            data.parent = url;
            crawlEmitter.emit('crawledUrl', data, depth + 1);
        });

    } else {
        visited[url]++;
        crawlEmitter.emit('crawledUrl', -1, depth + 1);
    }
}

/**
 * @param url
 * @param types
 * @param callback
 * @return {string}
 */
function crawl(url, types, callback){
    if (!url) return;

    let protocol = urlUtil.parse(url).protocol;
    if (protocol){
        protocol = protocol.replace(':', '');
    } else {
        return;
    }
    console.log("crawling url: " + url);
    let http = protocol === "https" ? require("https") : require("http");

    if (!url){
        return "No error";
    }
    let retry = false;
    let newUrl;
    let request = http.get(url, (res) => {
        const { statusCode } = res;
        if (statusCode !== 200){
            console.log(statusCode);
            console.log(res.statusMessage);

            if (statusCode == 301){
                console.log('Redirected to new url', res.headers['location']);
                newUrl = res.headers['location'];
                retry = true;
                request.abort();
                crawl(newUrl, types, callback);
            }
        }

        const contentType = res.headers['content-type'];
        //console.log(contentType);

        let page = "";
        res.on('data', (chunk) => {
            page += chunk;
        });

        res.on('end', () => {
            parseHtml(page, types, callback, url);
        });

    }, (err) =>{
        console.log('http request died', err);
    });
}



/**
 *
 * @param htmlString
 * @param callback on end of html parsing
 */
function parseHtml(htmlString, types, callback, url){
    let data = {};
    let currentAttr;

    let parser = new htmlparser.Parser({
        onopentag: function(name, attr){
            currentAttr = name;
            parseTypes(name, attr, types, data);
        },
        ontext: function(text){
            parseInnerText(currentAttr, text, types, data);
        },
        // onclosetag: function(tagname){
        //
        // },
        onend: () => {
            if (types['a'] && types['a'].includes('href') && data['a'] && data['a']['href']){
                data['a']['href'] = data['a']['href'].map((link) =>{
                    if (link && link.startsWith("/")){
                        link =  urlUtil.parse(url).protocol + "//" + urlUtil.parse(url).host + link;
                    }
                    return link;
                });
            }
            callback(data);
        }
    }, {decodeEntities: true});
    parser.write(htmlString);
    parser.end();
}

function parseInnerText(name, text, types, data){
    if (types[name]){

        data[name] = data[name] ? data[name] : {};

        if (types[name].includes('innerHTML')){
            data[name]['innerHTML'] = data[name]['innerHTML'] ? data[name]['innerHTML'] : [];
            if (text && /[A-Za-z0-9_@.;\/#&+-=_]*/g.test(text)){
                data[name]['innerHTML'].push(text);
            }
        }
    }

}

function parseTypes(name, attr, types, data){

    if (types[name]){
        data[name] = data[name] ? data[name] : {};
        types[name].forEach((atribute)=>{
            if (atribute != 'innerHTML'){
                data[name][atribute] = data[name][atribute] ? data[name][atribute] : [];
                data[name][atribute].push(attr[atribute]);
            }
        });
    }

}


/**
 * @description saves the given json to file
 * @param path
 * @param obj
 * @param pretty
 */
function saveobjToFile(path, obj, pretty){
    pretty = pretty ? 4 : null;
    let json = JSON.stringify(obj, null, pretty);
    fs.writeFile(path, json, 'utf-8');
}


/*

crawlEmitter.on('gotDataForUrl', (urls, types, depth, maxDepth, data, callback) => {
    setTimeout(() =>{
        if (depth < maxDepth || cantContinue){
            //crawlWithDepth(url, types,  maxDepth, depth+1, callback)
            if (urls.length > 0){
                urls.forEach((url) => {
                    setTimeout(()=>{
                        crawlWithDepth(url, types,  maxDepth, depth+1, data, callback);
                    }, 1000)
                });
            } else {
                console.log('no more urls');
            }

        } else {
            console.log('what');
            callback(data);
        }
    }, 1000)
});

/**
 * @description works while maxdepth is reachable if not it fails.
 * @param url
 * @param types
 * @param maxDepth
 * @param depth
 * @param data
 * @param callback
 */
/*
function crawlWithDepth(url, types, maxDepth, depth, data, callback){
    data = data ? data : {};

    depth = depth ? depth : 0;

    types = types ? types : {};
    if (!types['a'] || !types['a'].includes('href')){
        types['a'] = types['a'] ? types['a'] : [];
        types['a'].push('href');
    }


    setTimeout(()=>{
        crawl(url, types, function(result){
            data[url] = result;
            data[url] = data[url] ? data[url] : {};
            data[url]._depth = depth;

            let urls = [];

            if (data[url]['a'] && data[url]['a']['href']){
                urls = data[url]['a']['href'];
            }

            crawlEmitter.emit('gotDataForUrl', urls, types, depth, maxDepth, data, callback);
        })
    }, 1000)

}
*/


module.exports = {
    crawlUrl: crawl,
    crawlWithDepth: crawlWithDepth,
    saveJSON: saveobjToFile
};
