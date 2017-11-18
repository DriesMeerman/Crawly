#!/usr/bin/env node
const htmlparser = require("htmlparser2");
const EventEmitter = require('events');
const urlUtil = require('url');
const fs = require('fs');

class CrawlEmitter extends EventEmitter {}
const crawlEmitter = new CrawlEmitter();



crawlEmitter.on('gotDataForUrl', (urls, types, depth, maxDepth, data, callback) => {
    //console.log('got data for url', depth, maxDepth);

    //check if reached end before depth end
    // let temp = data.filter((urlObj) => {
    //     if (urlObj._depth == depth){
    //         return urlObj;
    //     }
    // });

    // let cantContinue = false;
    // temp.forEach((urlObj) => {
    //
    // });

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
/*
function crawlWithDepth(url, types, maxDepth, depth, data, callback){
    let crawlCount = 0;
    let urls = [url];

    crawl(url, types, () => {

    })
}

function startUrlWorker(urls){
    crawlWorker(urls)
}

function crawlWorker(urls){

}
*/

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
                return;
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
        console.log(err);
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

module.exports = {
    crawlUrl: crawl,
    crawlWithDepth: crawlWithDepth,
    saveJSON: saveobjToFile
};
