'use strict';

const { setDefaultTimeout, setWorldConstructor } = require("cucumber");

const webdriver = require('selenium-webdriver');

const { v4: uuidv4 } = require('uuid');

class CustomWorld {
    constructor(args) {
        this.url = '';
        this.baseUrl = args.parameters.baseUrl;
        this.shortenerUrl = args.parameters.shortenerUrl;
        this.driver = new webdriver.Builder().forBrowser('chrome').build();
    }

    generateUrl() {
        this.url = `${this.baseUrl}/${uuidv4()}`;
    }
}

setWorldConstructor(CustomWorld);

setDefaultTimeout(10 * 1000);