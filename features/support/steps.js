'use strict';

const {Given, When, Then, After} = require("cucumber");

const {By, until} = require('selenium-webdriver');
const expect = require('expect');

Given('a long URL', function () {
    this.generateUrl();
});

When('I shorten it', async function () {
    const driver = this.driver;
    const url = this.url;

    await driver.get(this.shortenerUrl);
    await driver.findElement(By.name('url'))
                .sendKeys(url);
    return driver.findElement(By.name('shorten')).click();
});

Then('I should be given a shorter URL to the original URL', async function () {
    const driver = this.driver;
    const url = this.url;

    await driver.wait(until.urlMatches(new RegExp(`${this.shortenerUrl}/.+`)));
    const original = await driver.findElement(By.id('original'));
    const originalHref = await original.getAttribute('href');

    expect(originalHref).toMatch(url);
});

After(function() {
    return this.driver.quit();
 });