import express from "express";
import validator from "validator";

import AbuseDB from "../providers/abusedb.js";
import DNS from "../providers/dns.js";
import Http from "../providers/http.js";
import Urlscan from "../providers/urlscan.js";

var router = express.Router();

/* GET users listing. */
router.post('/submit', async function(req, res, next) {
    let body = {
        'success': false
    };
    let checks = req.body.checks || 'dns,abusedb,urlscan';
    checks = checks.split(',');

    // Have they submitted a URL?
    let target = req.body.url || false;
    if (target == false) {
        body['message'] = "You must provide a URL to analyse";
        res.json(body);
    }

    // If they have, is it valid?
    if (!validator.isURL(target, { protocols: ['http', 'https'], require_protocol: true })) {
        body['message'] = `${target} does not appear to be a valid URL, or the protocol is not allowed`;
        res.json(body);
    }

    // Got this far, so add it to the response
    body['target'] = {};
    body['target']['url'] = target;
    body['target']['hostname'] = new URL(target).hostname;

    // What about getting the HTTP response
    if (checks.includes('http')) {
        let http = await Http.lookup(body["target"]["url"]);
        body['http'] = http;
    }

    // Now, let's do a DNS lookup (unless not specified)
    if (checks.includes('dns') || checks.includes('abusedb')) {
        body['dns'] = [];
        let types = ['A', 'AAAA'];

        for (let r of types) {
            let dns = await DNS.lookup(body["target"]["hostname"], r);
            body['dns'] = [...body['dns'], ...dns];
        }
    }

    // Now, let's do a scan with findabuse.email (unless not specified)
    if (checks.includes('abusedb')) {
        let abusedb = await AbuseDB.lookup(body['dns']);
        body['abusedb'] = abusedb;
    }

    // Now, let's do a scan with urlscan.io (unless not specified)
    if (checks.includes('urlscan')) {
        if (!global.config['urlscan'] == '') {
            let urlscan = await Urlscan.lookup(global.config['urlscan'], body["target"]["url"]);
            body['urlscan'] = urlscan;
        };
    }

    // Cache the lookup
    global.db.set(
        Buffer.from(body['target']['url']).toString('base64'),
        JSON.stringify(body)
    );

    // And respond
    body['success'] = true;
    res.json(body);
});

export default router;